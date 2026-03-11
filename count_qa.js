const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'Final_Output');

// Function to safely check if directory exists
if (!fs.existsSync(targetDir)) {
    console.error(`Error: Directory 'Final_Output' not found in ${__dirname}`);
    process.exit(1);
}

// Function to perform Q & A counting in a file
function countQAInFile(filePath) {
    let qCount = 0;
    let aCount = 0;
    
    // Check if it's text or JSON based on file extension
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
            // Unlikely to have questions.json based on earlier inspection, but just in case
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

// Recursively find all question files in a directory
function countQAInDirectory(dir) {
    let totalQuestions = 0;
    let totalAnswers = 0;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            const subCounts = countQAInDirectory(fullPath);
            totalQuestions += subCounts.questions;
            totalAnswers += subCounts.answers;
        } else if (stat.isFile() && (item.startsWith('questions') || item === 'lesson.txt' || fullPath.includes('CQ') || fullPath.includes('MCQ'))) {
            // Count if it's questions.txt, or files inside CQ/MCQ folder
             if (item.endsWith('.txt') || item.endsWith('.json')) {
                const fileCounts = countQAInFile(fullPath);
                totalQuestions += fileCounts.questions;
                totalAnswers += fileCounts.answers;
             }
        }
    }
    
    return { questions: totalQuestions, answers: totalAnswers };
}

// Prepare CSV records
const csvRecords = [];
// CSV Header
csvRecords.push('\uFEFFSubject,Chapter,Total Questions,Total Answers'); // \uFEFF for Excel UTF-8 BOM

const subjects = fs.readdirSync(targetDir).filter(f => fs.statSync(path.join(targetDir, f)).isDirectory());

console.log('Calculating counts... Please wait.');

for (const subject of subjects) {
    const subjectPath = path.join(targetDir, subject);
    let subjectQ = 0;
    let subjectA = 0;
    
    const chapters = fs.readdirSync(subjectPath).filter(f => fs.statSync(path.join(subjectPath, f)).isDirectory());
    
    for (const chapter of chapters) {
        const chapterPath = path.join(subjectPath, chapter);
        const chapterCounts = countQAInDirectory(chapterPath);
        
        subjectQ += chapterCounts.questions;
        subjectA += chapterCounts.answers;
        
        // Add chapter row
        csvRecords.push(`"${subject}","${chapter}",${chapterCounts.questions},${chapterCounts.answers}`);
        console.log(`Processed: ${subject} > ${chapter} -> Q: ${chapterCounts.questions}, A: ${chapterCounts.answers}`);
    }
    
    // Add Subject summary row (blank chapter column, or "All Chapters")
    csvRecords.push(`"${subject}","-- TOTAL --",${subjectQ},${subjectA}`);
    console.log(`SUBJECT TOTAL: ${subject} -> Q: ${subjectQ}, A: ${subjectA}\n`);
}

// Write to CSV
const csvFilePath = path.join(__dirname, 'QA_Counts.csv');
fs.writeFileSync(csvFilePath, csvRecords.join('\n'), 'utf8');

console.log(`\nSuccess! Extracted counts and saved to: ${csvFilePath}`);
