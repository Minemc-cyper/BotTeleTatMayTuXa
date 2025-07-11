param([int]$seconds = 10)

# Thiết lập mã hóa UTF-8 để hỗ trợ tiếng Việt
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($true)

Add-Type -AssemblyName PresentationFramework

# Tải giao diện XAML từ file
$xamlPath = Join-Path $PSScriptRoot "countdown.xaml"
[xml]$xaml = Get-Content $xamlPath -Raw -Encoding UTF8

$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [Windows.Markup.XamlReader]::Load($reader)
$countdownText = $window.FindName("CountdownText")

# Tạo đồng hồ đếm ngược
$timer = New-Object System.Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromSeconds(1)
$timer.Add_Tick({
    if ($seconds -le 0) {
        $timer.Stop()
        $window.Close()
    } else {
        $countdownText.Text = "🕒 Máy tính sẽ tự động tắt sau $seconds giây..."
        $seconds--
    }
})
$timer.Start()

$window.ShowDialog() | Out-Null