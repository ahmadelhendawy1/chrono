; Chrono - single-file Windows installer (NSIS 3, Unicode).
; Compiled by scripts/make-installer.js with:
;   -DAPP_DIR=<packaged app folder> -DVERSION=x.y.z -DOUTFILE=<installer path> -DICON=<icon.ico>
Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"

!define APPNAME "Chrono"
!define COMPANY "AI4EduTech"
!define UNKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Chrono"
!define RUNKEY "Software\Microsoft\Windows\CurrentVersion\Run"

Name "${APPNAME}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\Programs\Chrono"
InstallDirRegKey HKCU "Software\Chrono" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
BrandingText "${APPNAME} ${VERSION}  -  ${COMPANY}"
ShowInstDetails show
ShowUninstDetails show

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "Chrono"
VIAddVersionKey "CompanyName" "${COMPANY}"
VIAddVersionKey "FileDescription" "Chrono Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "${COMPANY}"

!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_LANGDLL_ALWAYSSHOW
!define MUI_FINISHPAGE_RUN "$INSTDIR\Chrono.exe"
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE DirLeave

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Arabic"

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd

Function un.onInit
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

; Always install into a folder called "Chrono" so uninstalling can never remove an unrelated folder.
Function DirLeave
  StrCpy $0 $INSTDIR "" -7
  StrCmp $0 "\Chrono" done
  StrCpy $INSTDIR "$INSTDIR\Chrono"
  done:
FunctionEnd

Section "Install"
  ; close a running copy so its files can be replaced
  nsExec::Exec 'taskkill /F /IM Chrono.exe'
  Pop $0
  Sleep 900

  SetOutPath "$INSTDIR"
  File /r "${APP_DIR}/*.*"
  WriteUninstaller "$INSTDIR\Uninstall Chrono.exe"

  CreateDirectory "$SMPROGRAMS\Chrono"
  CreateShortcut "$SMPROGRAMS\Chrono\Chrono.lnk" "$INSTDIR\Chrono.exe" "" "$INSTDIR\Chrono.exe" 0
  CreateShortcut "$SMPROGRAMS\Chrono\Uninstall Chrono.lnk" "$INSTDIR\Uninstall Chrono.exe"
  CreateShortcut "$DESKTOP\Chrono.lnk" "$INSTDIR\Chrono.exe" "" "$INSTDIR\Chrono.exe" 0

  WriteRegStr HKCU "Software\Chrono" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "DisplayName" "Chrono"
  WriteRegStr HKCU "${UNKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNKEY}" "Publisher" "${COMPANY}"
  WriteRegStr HKCU "${UNKEY}" "DisplayIcon" "$INSTDIR\Chrono.exe"
  WriteRegStr HKCU "${UNKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNKEY}" "UninstallString" '"$INSTDIR\Uninstall Chrono.exe"'
  WriteRegDWORD HKCU "${UNKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNKEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNKEY}" "EstimatedSize" 270000
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM Chrono.exe'
  Pop $0
  Sleep 900

  Delete "$DESKTOP\Chrono.lnk"
  RMDir /r "$SMPROGRAMS\Chrono"
  RMDir /r "$INSTDIR"

  DeleteRegKey HKCU "${UNKEY}"
  DeleteRegKey HKCU "Software\Chrono"
  ; "Start with Windows" entries written by the app
  DeleteRegValue HKCU "${RUNKEY}" "Chrono"
  DeleteRegValue HKCU "${RUNKEY}" "electron.app.Chrono"
  ; user settings and notes in %APPDATA%\Chrono are intentionally kept
SectionEnd
