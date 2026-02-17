#!/bin/bash
# =============================================================================
# Happy Android Testing Helper
# =============================================================================
# Resilient script for emulator management, device testing, and app deployment.
# Works with both emulator and real devices connected via USB/WiFi.
#
# Usage:
#   ./scripts/android-test.sh <command> [options]
#
# Commands:
#   start-emulator    Start the Android emulator (auto-cleans stale locks)
#   stop-emulator     Stop all running emulators
#   devices            List connected devices/emulators
#   install            Install the dev APK on connected device
#   launch             Launch Happy app on connected device
#   screenshot         Take a screenshot and save to ./screenshots/
#   metro              Start Metro bundler with port forwarding
#   connect-device     Setup WiFi ADB connection to a physical device
#   full-test          Full cycle: start emulator, install, launch, screenshot
#   status             Show full status (emulator, devices, Metro, app)
# =============================================================================

set -euo pipefail

# --- Configuration ---
ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-C:/Dev/android}}"
ADB="$ANDROID_SDK/platform-tools/adb.exe"
EMULATOR="$ANDROID_SDK/emulator/emulator.exe"
AVD_NAME="happy_test"
APP_PACKAGE="com.slopus.happy.dev"
METRO_PORT=8081
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCREENSHOT_DIR="$PROJECT_DIR/screenshots"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# --- Helpers ---

wait_for_device() {
    local timeout=${1:-60}
    info "Waiting for device (timeout: ${timeout}s)..."
    local count=0
    while [ $count -lt $timeout ]; do
        if "$ADB" devices | grep -q "device$"; then
            log "Device connected"
            return 0
        fi
        sleep 2
        count=$((count + 2))
    done
    err "No device found after ${timeout}s"
    return 1
}

wait_for_boot() {
    local timeout=${1:-120}
    info "Waiting for device boot (timeout: ${timeout}s)..."
    local count=0
    while [ $count -lt $timeout ]; do
        local boot_completed=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
        if [ "$boot_completed" = "1" ]; then
            log "Device fully booted"
            return 0
        fi
        sleep 3
        count=$((count + 3))
    done
    err "Device did not boot within ${timeout}s"
    return 1
}

clean_stale_locks() {
    local avd_dir="$HOME/.android/avd/${AVD_NAME}.avd"
    if [ -d "$avd_dir" ]; then
        local lock_files=$(find "$avd_dir" -name "*.lock" 2>/dev/null)
        if [ -n "$lock_files" ]; then
            # Check if emulator is actually running
            if ! "$ADB" devices 2>/dev/null | grep -q "emulator"; then
                warn "Cleaning stale lock files from crashed emulator..."
                find "$avd_dir" -name "*.lock" -delete 2>/dev/null || true
                log "Stale locks cleaned"
            fi
        fi
    fi
}

dismiss_anr_dialogs() {
    info "Dismissing any ANR/crash dialogs..."
    # Try pressing Enter/OK to dismiss dialogs
    "$ADB" shell input keyevent KEYCODE_ENTER 2>/dev/null || true
    sleep 0.5
    # Also try pressing the "Wait" button (usually on the right)
    "$ADB" shell input keyevent KEYCODE_ENTER 2>/dev/null || true
    # Dismiss via broadcast
    "$ADB" shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS 2>/dev/null || true
}

get_device_serial() {
    "$ADB" devices | grep "device$" | head -1 | awk '{print $1}'
}

# --- Commands ---

cmd_start_emulator() {
    info "Starting Android emulator ($AVD_NAME)..."

    # Check if already running
    if "$ADB" devices 2>/dev/null | grep -q "emulator"; then
        log "Emulator already running"
        return 0
    fi

    # Clean stale locks from previous crashes
    clean_stale_locks

    # Start emulator in background with GPU host acceleration
    # -gpu host: uses host GPU (NVIDIA RTX 3050 Ti) for best performance
    # -no-snapshot-load: fresh boot avoids corrupted snapshot issues
    # -no-audio: prevents audio driver conflicts
    "$EMULATOR" -avd "$AVD_NAME" \
        -gpu host \
        -no-snapshot-load \
        -no-audio \
        -no-boot-anim \
        &>/dev/null &

    local emu_pid=$!
    info "Emulator PID: $emu_pid"

    # Wait for device to appear
    if ! wait_for_device 60; then
        err "Emulator failed to start. Try: $0 stop-emulator && $0 start-emulator"
        return 1
    fi

    # Wait for full boot
    if ! wait_for_boot 120; then
        err "Emulator booted but Android not ready"
        return 1
    fi

    # Dismiss any initial dialogs
    sleep 3
    dismiss_anr_dialogs

    log "Emulator ready!"
}

cmd_stop_emulator() {
    info "Stopping emulators..."
    "$ADB" emu kill 2>/dev/null || true
    sleep 2

    # Force kill any remaining QEMU processes (Windows)
    taskkill //F //IM qemu-system-x86_64.exe 2>/dev/null || true

    # Clean lock files
    clean_stale_locks
    log "Emulator stopped"
}

cmd_devices() {
    info "Connected devices:"
    "$ADB" devices -l

    echo ""
    local device_count=$("$ADB" devices | grep "device$" | wc -l)
    if [ "$device_count" -eq 0 ]; then
        warn "No devices connected"
        echo "  Emulator: $0 start-emulator"
        echo "  USB:      Connect phone with USB debugging enabled"
        echo "  WiFi:     $0 connect-device <IP>"
    else
        log "$device_count device(s) connected"
    fi
}

cmd_install() {
    local device=$(get_device_serial)
    if [ -z "$device" ]; then
        err "No device connected. Run: $0 start-emulator"
        return 1
    fi

    info "Checking if $APP_PACKAGE is installed on $device..."
    if "$ADB" -s "$device" shell pm list packages | grep -q "$APP_PACKAGE"; then
        log "App already installed"
    else
        warn "App not installed. Build and install with:"
        echo "  cd $PROJECT_DIR && APP_ENV=development npx expo run:android"
        echo "  OR install a pre-built APK:"
        echo "  $ADB -s $device install path/to/app.apk"
        return 1
    fi
}

cmd_launch() {
    local device=$(get_device_serial)
    if [ -z "$device" ]; then
        err "No device connected"
        return 1
    fi

    info "Launching $APP_PACKAGE..."

    # Force stop first to ensure clean start
    "$ADB" -s "$device" shell am force-stop "$APP_PACKAGE" 2>/dev/null || true
    sleep 1

    # Launch main activity
    "$ADB" -s "$device" shell monkey -p "$APP_PACKAGE" \
        -c android.intent.category.LAUNCHER 1 2>/dev/null

    log "App launched on $device"
}

cmd_screenshot() {
    local device=$(get_device_serial)
    if [ -z "$device" ]; then
        err "No device connected"
        return 1
    fi

    mkdir -p "$SCREENSHOT_DIR"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local filename="screenshot_${timestamp}.png"
    local device_path="/sdcard/screenshot.png"
    local local_path="$SCREENSHOT_DIR/$filename"

    info "Taking screenshot..."
    "$ADB" -s "$device" shell screencap -p "$device_path"
    "$ADB" -s "$device" pull "$device_path" "$local_path"
    "$ADB" -s "$device" shell rm "$device_path"

    log "Screenshot saved: $local_path"
}

cmd_metro() {
    local device=$(get_device_serial)

    if [ -n "$device" ]; then
        info "Setting up port forwarding ($METRO_PORT)..."
        "$ADB" -s "$device" reverse tcp:$METRO_PORT tcp:$METRO_PORT
        log "Port forwarding: device:$METRO_PORT -> host:$METRO_PORT"
    fi

    info "Starting Metro bundler..."
    cd "$PROJECT_DIR"
    APP_ENV=development npx expo start --dev-client --port $METRO_PORT
}

cmd_connect_device() {
    local ip="${1:-}"
    if [ -z "$ip" ]; then
        err "Usage: $0 connect-device <device-ip-address>"
        echo ""
        echo "  1. Enable Developer Options on your Android phone"
        echo "  2. Enable USB Debugging"
        echo "  3. Enable Wireless Debugging (Android 11+)"
        echo "  4. Connect phone to same WiFi as this PC"
        echo "  5. Find the IP in Settings > About Phone > IP Address"
        echo "  6. Run: $0 connect-device 192.168.x.x"
        echo ""
        echo "  For USB debugging (no IP needed):"
        echo "  Just connect the phone via USB and it will appear in 'devices'"
        return 1
    fi

    info "Connecting to $ip:5555..."
    "$ADB" tcpip 5555 2>/dev/null || true
    sleep 1
    "$ADB" connect "$ip:5555"

    if wait_for_device 10; then
        log "Connected to $ip"
    else
        err "Could not connect to $ip:5555"
        echo "  Make sure the device is on the same network"
        echo "  and wireless debugging is enabled"
        return 1
    fi
}

cmd_full_test() {
    info "=== Full Android Test Cycle ==="
    echo ""

    # Step 1: Ensure device is ready
    if ! "$ADB" devices 2>/dev/null | grep -q "device$"; then
        cmd_start_emulator
    else
        log "Device already connected"
    fi

    # Step 2: Setup port forwarding
    local device=$(get_device_serial)
    "$ADB" -s "$device" reverse tcp:$METRO_PORT tcp:$METRO_PORT 2>/dev/null || true

    # Step 3: Check app is installed
    cmd_install || true

    # Step 4: Launch app
    cmd_launch

    # Step 5: Wait and screenshot
    sleep 5
    dismiss_anr_dialogs
    sleep 2
    cmd_screenshot

    echo ""
    log "=== Test cycle complete ==="
    info "Screenshot saved to $SCREENSHOT_DIR/"
    info "To start Metro: $0 metro"
}

cmd_status() {
    echo "=== Happy Android Test Status ==="
    echo ""

    # Emulator/Device
    info "Devices:"
    "$ADB" devices -l 2>/dev/null || echo "  ADB not available"
    echo ""

    # App status
    local device=$(get_device_serial)
    if [ -n "$device" ]; then
        if "$ADB" -s "$device" shell pm list packages 2>/dev/null | grep -q "$APP_PACKAGE"; then
            log "App installed: $APP_PACKAGE"
            # Check if running
            if "$ADB" -s "$device" shell pidof "$APP_PACKAGE" >/dev/null 2>&1; then
                log "App is running"
            else
                warn "App is not running"
            fi
        else
            warn "App not installed"
        fi

        # Port forwarding
        if "$ADB" -s "$device" reverse --list 2>/dev/null | grep -q "$METRO_PORT"; then
            log "Port forwarding active (port $METRO_PORT)"
        else
            warn "No port forwarding for Metro"
        fi
    fi

    # Metro
    if curl -s "http://localhost:$METRO_PORT/status" >/dev/null 2>&1; then
        log "Metro bundler running on port $METRO_PORT"
    else
        warn "Metro not running"
    fi

    echo ""
}

# --- Main ---
command="${1:-help}"
shift || true

case "$command" in
    start-emulator)  cmd_start_emulator ;;
    stop-emulator)   cmd_stop_emulator ;;
    devices)         cmd_devices ;;
    install)         cmd_install ;;
    launch)          cmd_launch ;;
    screenshot)      cmd_screenshot "$@" ;;
    metro)           cmd_metro ;;
    connect-device)  cmd_connect_device "$@" ;;
    full-test)       cmd_full_test ;;
    status)          cmd_status ;;
    help|*)
        echo "Happy Android Testing Helper"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start-emulator    Start emulator (cleans stale locks, GPU host)"
        echo "  stop-emulator     Stop all emulators"
        echo "  devices           List connected devices"
        echo "  install           Check app installation on device"
        echo "  launch            Launch Happy app"
        echo "  screenshot        Take screenshot -> ./screenshots/"
        echo "  metro             Start Metro with port forwarding"
        echo "  connect-device    Connect to phone via WiFi ADB"
        echo "  full-test         Full cycle: emulator + install + launch + screenshot"
        echo "  status            Show full testing status"
        echo ""
        echo "Real Device (USB):"
        echo "  1. Enable USB Debugging on phone"
        echo "  2. Connect via USB"
        echo "  3. $0 devices"
        echo "  4. $0 launch"
        echo ""
        echo "Real Device (WiFi - Android 11+):"
        echo "  1. Enable Wireless Debugging on phone"
        echo "  2. $0 connect-device <phone-ip>"
        echo "  3. $0 launch"
        ;;
esac
