@echo off
setlocal enableextensions enabledelayedexpansion

set app=ffmpeg

%app% -f concat -safe 0 -i %1 -i "%~n1.jpg" -map 1 -map 0 -c copy -disposition:0 attached_pic "%~dp0%~n1.m4a"

endlocal
pause