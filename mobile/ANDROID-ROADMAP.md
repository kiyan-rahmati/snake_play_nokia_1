# Android App Roadmap

## Overview

Snake Play Nokia is designed first as a browser-based retro Snake game. This document describes a possible path toward an Android version while preserving the original Nokia-inspired experience.

The Android app is a planned extension, not an implemented feature.

## Goals

- Preserve the classic Nokia Snake gameplay.
- Support touch controls and different screen sizes.
- Keep the retro visual style and world themes.
- Support local saves and offline gameplay.
- Provide responsive performance on low-end Android devices.
- Preserve accessibility options where possible.

## Phase 1 — Mobile Web Optimization

Before building a native app, improve the existing browser version.

- [ ] Make the game board responsive.
- [ ] Add comfortable touch controls.
- [ ] Prevent accidental page scrolling during gameplay.
- [ ] Test portrait and landscape layouts.
- [ ] Verify audio controls on mobile browsers.
- [ ] Test offline functionality.
- [ ] Improve loading performance on low-memory devices.

## Phase 2 — Progressive Web App

Improve the existing PWA experience.

- [ ] Configure the web app manifest.
- [ ] Verify service worker caching.
- [ ] Provide a useful offline fallback page.
- [ ] Test installation from supported browsers.
- [ ] Verify app icons and splash-screen behavior.
- [ ] Test updates without losing saved progress.

## Phase 3 — Android Packaging

Evaluate a packaging approach once the mobile web version is stable.

Possible approaches:

- **Trusted Web Activity:** suitable for distributing a qualifying PWA through Android.
- **Capacitor:** suitable if native Android APIs or plugins are required.
- **Native Android development:** consider only if the game needs substantial platform-specific functionality.

The final approach should be selected after evaluating maintenance costs, device compatibility, and distribution requirements.

## Phase 4 — Android Integration

Potential features include:

- [ ] Android back-button behavior.
- [ ] System navigation and status-bar styling.
- [ ] Audio lifecycle handling.
- [ ] Save-data backup options.
- [ ] Optional haptic feedback.
- [ ] Performance testing across Android versions.
- [ ] App pause and resume handling.

## Phase 5 — Testing

Test the application on:

- Low-end Android devices.
- Different screen resolutions.
- Devices with limited memory.
- Touchscreens with different aspect ratios.
- Offline and unstable network conditions.
- Devices with reduced-motion preferences enabled.

Verify that gameplay, settings, and local saves continue to work correctly.

## Privacy and Permissions

Request only the Android permissions that are genuinely needed.

The game should not require contacts, location, microphone, or camera access for ordinary gameplay.

Any future online features must clearly explain what information is transmitted and how it is used.

## Release Checklist

Before publishing an Android version:

- [ ] Test gameplay from installation through game over.
- [ ] Verify save-data migration.
- [ ] Check accessibility and touch-target sizes.
- [ ] Test offline behavior.
- [ ] Prepare screenshots and store listing text.
- [ ] Review app signing and release configuration.
- [ ] Publish a privacy policy appropriate to the implemented features.
- [ ] Verify compliance with the chosen distribution platform's current requirements.

## Current Status

**Status:** Planning only

No native Android application or Android package is implemented by this roadmap.