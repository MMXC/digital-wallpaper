Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
If right(scriptPath, 1) <> "\" Then scriptPath = scriptPath & "\"

' 构建 bat 路径
batPath = scriptPath & "start-tray-inner.bat"

' 运行 bat（0=隐藏窗口）
WshShell.Run Chr(34) & batPath & Chr(34), 0, False
