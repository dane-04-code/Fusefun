@echo off
echo Setting up Visual Studio environment...
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"

echo Installing Anchor CLI 0.30.1...
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked --force

echo Verifying Anchor version...
anchor --version

echo Navigating to project directory...
cd /d "C:\Users\danel\OneDrive\Desktop\warehouse desigbn\code\main code\FUSE.FUN\fuse-launchpad\anchor"

echo Starting Anchor Build...
anchor build

echo Build process finished.
pause
