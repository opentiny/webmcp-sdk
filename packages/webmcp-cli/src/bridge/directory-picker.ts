import { spawn } from 'node:child_process'

export interface PickDirectoryOptions {
  title?: string
  defaultPath?: string
}

/**
 * 唤起宿主机操作系统原生的文件夹选择弹窗，返回用户选择的绝对路径。
 * 若用户取消返回 null；选择器不可用或异常退出时抛出带原因的错误。
 */
export async function pickDirectory(optionsOrTitle?: PickDirectoryOptions | string): Promise<string | null> {
  const options: PickDirectoryOptions =
    typeof optionsOrTitle === 'string' ? { title: optionsOrTitle } : optionsOrTitle || {}

  const title = options.title || '请选择工作空间文件夹'
  const defaultPath =
    options.defaultPath && typeof options.defaultPath === 'string' ? options.defaultPath.trim() : undefined
  const platform = process.platform

  if (platform === 'darwin') {
    return pickDirectoryMac(title, defaultPath)
  }
  if (platform === 'win32') {
    return pickDirectoryWindows(title, defaultPath)
  }
  return pickDirectoryLinux(title, defaultPath)
}

function pickDirectoryMac(title: string, defaultPath?: string): Promise<string | null> {
  const safeTitle = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const defaultClause = defaultPath
    ? ` default location POSIX file "${defaultPath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    : ''
  const appleScript = `POSIX path of (choose folder with prompt "${safeTitle}"${defaultClause})`

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('close', (code: number | null) => {
      if (code === 0) {
        const selected = stdout.trim()
        resolve(selected || null)
        return
      }
      // 用户在 macOS 弹窗中点击取消时，osascript 返回 exitCode 1 且包含 User canceled (-128)
      if (code === 1 && (stderr.includes('User canceled') || stderr.includes('-128') || !stderr.trim())) {
        resolve(null)
        return
      }
      reject(new Error(`唤起系统文件夹选择器失败: ${stderr.trim() || `退出码 ${code}`}`))
    })
    child.on('error', (err) => {
      reject(new Error(`唤起系统文件夹选择器失败: ${err.message}`))
    })
  })
}

function pickDirectoryWindows(title: string, defaultPath?: string): Promise<string | null> {
  // 使用 IFileOpenDialog COM 接口（Windows Vista+ 原生文件夹选择器）。
  // 不能用 FolderBrowserDialog：Node.js 以 CREATE_NO_WINDOW 启动子进程时，
  // WinForms ShowDialog() 拿不到桌面上下文，对话框永久阻塞直到超时。
  // IFileOpenDialog 通过 Shell COM 调用，父窗口传 IntPtr.Zero 即可正常弹出。
  const safeTitle = title.replace(/"/g, '\\"')

  // 用内联 C# 通过 COM interop 调用 IFileOpenDialog，避免 WinForms 消息循环依赖
  const psScript = `
$code = @'
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("D57C7288-D4AD-4768-BE02-9D969532D960"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IFileOpenDialog {
    [PreserveSig] int Show(IntPtr hwnd);
    void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
    void SetFileTypeIndex(uint iFileType);
    void GetFileTypeIndex(out uint piFileType);
    void Advise(IntPtr pfde, out uint pdwCookie);
    void Unadvise(uint dwCookie);
    void SetOptions(uint fos);
    void GetOptions(out uint pfos);
    void SetDefaultFolder(IntPtr psi);
    void SetFolder(IntPtr psi);
    void GetFolder(out IntPtr ppsi);
    void GetCurrentSelection(out IntPtr ppsi);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
    void GetResult(out IntPtr ppsi);
    void AddPlace(IntPtr psi, int fdap);
    void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
    void Close(int hr);
    void SetClientGuid([In] ref Guid guid);
    void ClearClientData();
    void SetFilter(IntPtr pFilter);
    void GetResults(out IntPtr ppenum);
    void GetSelectedItems(out IntPtr ppsai);
}

[ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IShellItem {
    void BindToHandler(IntPtr pbc, [In] ref Guid bhid, [In] ref Guid riid, out IntPtr ppv);
    void GetParent(out IShellItem ppsi);
    void GetDisplayName(uint sigdnName, [MarshalAs(UnmanagedType.LPWStr)] out string ppszName);
    void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
    void Compare(IShellItem psi, uint hint, out int piOrder);
}

public static class FolderPicker {
    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    static extern int SHCreateItemFromParsingName(string pszPath, IntPtr pbc, [In] ref Guid riid, out IntPtr ppv);

    // FOS_PICKFOLDERS = 0x20, FOS_FORCEFILESYSTEM = 0x40
    const uint FOS_PICKFOLDERS = 0x00000020;
    const uint FOS_FORCEFILESYSTEM = 0x00000040;

    public static string Pick(string title, string defaultPath) {
        var clsid = new Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7");
        var riid  = new Guid("D57C7288-D4AD-4768-BE02-9D969532D960");
        var obj = Activator.CreateInstance(Type.GetTypeFromCLSID(clsid));
        var dialog = (IFileOpenDialog)obj;
        dialog.SetOptions(FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM);
        dialog.SetTitle(title);
        if (!string.IsNullOrEmpty(defaultPath)) {
            var riidShellItem = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");
            IntPtr psi;
            if (SHCreateItemFromParsingName(defaultPath, IntPtr.Zero, ref riidShellItem, out psi) == 0) {
                dialog.SetFolder(psi);
                Marshal.Release(psi);
            }
        }
        int hr = dialog.Show(IntPtr.Zero);
        if (hr != 0) return null; // 用户取消 (HRESULT_FROM_WIN32(ERROR_CANCELLED) = 0x800704C7)
        IntPtr ppsi;
        dialog.GetResult(out ppsi);
        var shellItem = (IShellItem)Marshal.GetTypedObjectForIUnknown(ppsi, typeof(IShellItem));
        string path;
        shellItem.GetDisplayName(0x80058000, out path); // SIGDN_FILESYSPATH
        Marshal.Release(ppsi);
        return path;
    }
}
'@
Add-Type -TypeDefinition $code
$result = [FolderPicker]::Pick("${safeTitle}", "${(defaultPath ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")
if ($result) { Write-Output $result }
`

  return new Promise((resolve, reject) => {
    // 隐藏 PowerShell 控制台窗口：
    // 1. -WindowStyle Hidden 指示 PowerShell 不展示宿主控制台
    // 2. windowsHide: true 阻止 Windows 为子进程弹出黑色的终端窗口
    // IFileOpenDialog 通过系统 Shell COM 独立展示于桌面上，不受控制台隐藏影响
    const child = spawn('powershell', ['-STA', '-NoProfile', '-WindowStyle', 'Hidden', '-Command', psScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('close', (code: number | null) => {
      if (code === 0) {
        const selected = stdout.trim()
        resolve(selected || null)
        return
      }
      reject(new Error(`PowerShell 文件夹选择器执行失败: ${stderr.trim() || `退出码 ${code}`}`))
    })
    child.on('error', (err) => {
      reject(new Error(`唤起 PowerShell 文件夹选择器失败: ${err.message}`))
    })
  })
}

function pickDirectoryLinux(title: string, defaultPath?: string): Promise<string | null> {
  const args = ['--file-selection', '--directory', `--title=${title}`]
  if (defaultPath) {
    args.push(`--filename=${defaultPath}`)
  }

  return new Promise((resolve, reject) => {
    const child = spawn('zenity', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    child.on('close', (code: number | null) => {
      if (code === 0) {
        const selected = stdout.trim()
        resolve(selected || null)
        return
      }
      // zenity 用户点击取消退出码为 1
      if (code === 1) {
        resolve(null)
        return
      }
      reject(new Error(`zenity 目录选择器异常退出 (退出码 ${code}): ${stderr.trim()}`))
    })
    child.on('error', (err: any) => {
      if (err?.code === 'ENOENT') {
        reject(new Error('未检测到 zenity 目录选择器，请先在系统中安装 zenity (例如: sudo apt install zenity)'))
        return
      }
      reject(new Error(`唤起 zenity 目录选择器失败: ${err.message}`))
    })
  })
}
