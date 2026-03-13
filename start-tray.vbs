Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)
If right(scriptPath, 1) <> "\" Then scriptPath = scriptPath & "\"

' 构建路径
trayPath = scriptPath & "windows-tray"

' 创建日志目录
If Not fso.FolderExists(scriptPath & "logs") Then 
    fso.CreateFolder(scriptPath & "logs")
End If

logFile = scriptPath & "logs\start-tray.log"

' 检查 node
Set objShell = CreateObject("WScript.Shell")
Set objExec = objShell.Exec("node --version")
If objExec.ExitCode <> 0 Then
    fso.OpenTextFile(logFile, 8, True).WriteLine Now() & " [X] Error: Node.js not found"
    WScript.Quit 1
End If

' 检查并安装依赖
If Not fso.FolderExists(trayPath & "\node_modules") Then
    fso.OpenTextFile(logFile, 8, True).WriteLine Now() & " [*] Installing tray dependencies..."
    objShell.CurrentDirectory = trayPath
    objShell.Run "cmd /c npm install", 0, True
End If

' 启动 tray app（隐藏窗口）
fso.OpenTextFile(logFile, 8, True).WriteLine Now() & " [*] Launching Tray App"
objShell.CurrentDirectory = trayPath
objShell.Run "cmd /c npx electron . --disable-gpu --no-sandbox", 0, False

fso.OpenTextFile(logFile, 8, True).WriteLine Now() & " [=] Started"
