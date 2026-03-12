const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'Final_Output');

// Function to safely check if directory exists
if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory 'Final_Output' not found in ${__dirname}`);
    process.exit(1);
}

// Function to perform Q & A counting in a single file
function countQAInFile(filePath) {
    let qCount = 0;
    let aCount = 0;
    
    try {
        if (filePath.endsWith('.txt')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            let inQuestion = false;
            let hasAnswer = false;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.startsWith('Question #')) {
                    if (inQuestion && hasAnswer) aCount++;
                    qCount++;
                    inQuestion = true;
                    hasAnswer = false;
                }
                
                if (inQuestion && line.startsWith('Correct Answer:')) {
                    const ansPart = line.replace('Correct Answer:', '').trim();
                    if (ansPart.length > 0) hasAnswer = true;
                }
                
                if (inQuestion && line.startsWith('Solution:')) {
                    if (i + 1 < lines.length && lines[i+1].trim() !== '') {
                        hasAnswer = true;
                    }
                }
                
                if (inQuestion && line.startsWith('Explanation:')) {
                    if (i + 1 < lines.length && lines[i+1].trim() !== '') {
                        hasAnswer = true;
                    }
                }
            }
            if (inQuestion && hasAnswer) aCount++;
        } else if (filePath.endsWith('.json')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            const items = parsed.data || parsed;
            
            if (Array.isArray(items)) {
                items.forEach(item => {
                    qCount++;
                    if (item.correct_answer || item.solution || item.explanation) {
                        aCount++;
                    }
                });
            }
        }
    } catch (e) {
        console.error(`Error reading ${filePath}: ${e.message}`);
    }
    
    return { questions: qCount, answers: aCount };
}

// Recursively find and count ALL QA files in a directory
function countQAInDirectory(dir) {
    let q = 0;
    let a = 0;
    
    if (!fs.existsSync(dir)) return { questions: 0, answers: 0 };
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            const sub = countQAInDirectory(fullPath);
            q += sub.questions;
            a += sub.answers;
        } else if (stat.isFile() && (item.endsWith('.txt') || item.endsWith('.json'))) {
             // Matching logic from count_qa.js
             if (item.startsWith('questions') || item === 'lesson.txt' || fullPath.includes('CQ') || fullPath.includes('MCQ')) {
                const fileCounts = countQAInFile(fullPath);
                q += fileCounts.questions;
                a += fileCounts.answers;
             }
        }
    }
    
    return { questions: q, answers: a };
}

const csvRecords = [];
csvRecords.push('\uFEFFClass,Subject,Chapter,Topic,Total Questions,Total Answers');

console.log('Calculating counts down to the Topic level... Please wait (this may take a moment).');

const classes = fs.readdirSync(targetDir).filter(f => !f.startsWith('.') && fs.statSync(path.join(targetDir, f)).isDirectory());

let grandQ = 0;
let grandA = 0;

for (const cls of classes) {
    const classPath = path.join(targetDir, cls);
    const subjects = fs.readdirSync(classPath).filter(f => !f.startsWith('.') && fs.statSync(path.join(classPath, f)).isDirectory());
    
    for (const subject of subjects) {
        const subjectPath = path.join(classPath, subject);
        const chapters = fs.readdirSync(subjectPath).filter(f => !f.startsWith('.') && fs.statSync(path.join(subjectPath, f)).isDirectory());
        
        for (const chapter of chapters) {
            const chapterPath = path.join(subjectPath, chapter);
            const chapterItems = fs.readdirSync(chapterPath).filter(f => !f.startsWith('.') && fs.statSync(path.join(chapterPath, f)).isDirectory());
            
            let chapterTotalQ = 0;
            let chapterTotalA = 0;
            let topicsFound = new Set();

            // 1. Process "lessons" folder if it exists
            const lessonsPath = path.join(chapterPath, 'lessons');
            if (fs.existsSync(lessonsPath) && fs.statSync(lessonsPath).isDirectory()) {
                const topics = fs.readdirSync(lessonsPath).filter(f => !f.startsWith('.') && fs.statSync(path.join(lessonsPath, f)).isDirectory());
                for (const topic of topics) {
                    const topicPath = path.join(lessonsPath, topic);
                    const topicCounts = countQAInDirectory(topicPath);
                    if (topicCounts.questions > 0) {
                        csvRecords.push(`"${cls}","${subject}","${chapter}","${topic.replace(/"/g, '""')}",${topicCounts.questions},${topicCounts.answers}`);
                        chapterTotalQ += topicCounts.questions;
                        chapterTotalA += topicCounts.answers;
                    }
                }
                topicsFound.add('lessons');
            }

            // 2. Process CQ, MCQ, সংক্ষিপ্ত as topics
            const specificFolders = ['CQ', 'MCQ', 'সংক্ষিপ্ত'];
            for (const folder of specificFolders) {
                const folderPath = path.join(chapterPath, folder);
                if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
                    const folderCounts = countQAInDirectory(folderPath);
                    if (folderCounts.questions > 0) {
                        csvRecords.push(`"${cls}","${subject}","${chapter}","${folder}",${folderCounts.questions},${folderCounts.answers}`);
                        chapterTotalQ += folderCounts.questions;
                        chapterTotalA += folderCounts.answers;
                    }
                    topicsFound.add(folder);
                }
            }

            // 3. Process any other subfolders as topics
            for (const item of chapterItems) {
                if (topicsFound.has(item)) continue;
                const itemPath = path.join(chapterPath, item);
                const itemCounts = countQAInDirectory(itemPath);
                if (itemCounts.questions > 0) {
                    csvRecords.push(`"${cls}","${subject}","${chapter}","${item.replace(/"/g, '""')}",${itemCounts.questions},${itemCounts.answers}`);
                    chapterTotalQ += itemCounts.questions;
                    chapterTotalA += itemCounts.answers;
                }
            }

            // 4. Check for any direct files in chapter root that weren't counted (should be none with recursive, but safety)
            const overallChapterCounts = countQAInDirectory(chapterPath);
            const remainingQ = overallChapterCounts.questions - chapterTotalQ;
            const remainingA = overallChapterCounts.answers - chapterTotalA;
            
            if (remainingQ > 0) {
                csvRecords.push(`"${cls}","${subject}","${chapter}","[Root Chapter]",${remainingQ},${remainingA}`);
                chapterTotalQ += remainingQ;
                chapterTotalA += remainingA;
            }

            grandQ += chapterTotalQ;
            grandA += chapterTotalA;
        }
    }
}

csvRecords.push('');
csvRecords.push(`"","--- GRAND TOTAL ---","","",${grandQ},${grandA}`);

const csvFilePath = path.join(__dirname, 'Topic_QA_Counts.csv');
fs.writeFileSync(csvFilePath, csvRecords.join('\n'), 'utf8');

console.log(`\nSuccess! Topic counts extracted and saved to: ${csvFilePath}`);
console.log(`GRAND TOTAL -> Questions: ${grandQ}, Answers: ${grandA}`);
