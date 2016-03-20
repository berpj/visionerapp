#!/bin/bash

electron-packager . Visioner --platform=darwin --arch=all --icon=icons/os_x.icns --overwrite --asar=true --app-version=1.0.0 --build-version=1.0.0 --app-copyright="Pierre-Jean Bergeron"
#electron-packager . Visioner --platform=win32 --arch=x64 --icon=icons/logo.png --overwrite --asar=true --app-version=1.0.0 --build-version=1.0.0 --app-copyright="Pierre-Jean Bergeron"

electron-installer-dmg ./Visioner-darwin-x64/Visioner.app Visioner --out ../visionerapp.com --background=icons/dmg.png --icon=icons/os_x.icns --overwrite

#rm Visioner-*.zip

#zip -r -y Visioner-darwin-x64.zip Visioner-darwin-x64
#zip -r Visioner-linux-ia32.zip Visioner-linux-ia32
#zip -r Visioner-linux-x64.zip Visioner-linux-x64
#zip -r Visioner-win32-ia32.zip Visioner-win32-ia32
#zip -r Visioner-win32-x64.zip Visioner-win32-ia32
