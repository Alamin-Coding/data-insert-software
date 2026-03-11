@echo off
chcp 65001 >nul
cd /d E:\data\data-insert-software
echo --- CLIENT OUTPUT COMPILER ---
echo.
echo This will create a CLEAN copy of your data in "Final_Output"
echo Your original "data-insert-software" folder and its lesson.txt files will not be changed.
echo.
node organize_all_lessons.js
echo.
echo Compilation Complete! You can now send the "Final_Output" folder to your client.
echo.
echo Press any key to exit...
pause >nul
