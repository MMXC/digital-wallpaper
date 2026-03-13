Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "%~dp0start-tray-inner.bat" & Chr(34), 0, False
