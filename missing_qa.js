const fs = require('fs');
const path = require('path');

const csvFilePath = path.join(__dirname, 'QA_Counts.csv');
const outputPath = path.join(__dirname, 'Missing_QA.csv');

try {
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvData.split('\n');
    let records = [];

    // Skip the first header line
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('=') || line.startsWith('-') || line.startsWith('ALL CLASS') || line.startsWith('TOTAL')) continue;
        
        // Match standard row format
        const cols = line.split(',');
        if (cols.length >= 4) {
            const subject = cols[0].replace(/"/g, '').trim();
            const chapter = cols[1].replace(/"/g, '').trim();
            const qCount = parseInt(cols[2], 10);
            const aCount = parseInt(cols[3], 10);

            if (!isNaN(qCount) && !isNaN(aCount)) {
                // Check if this is a TOTAL line
                if (chapter === '-- TOTAL --' || subject === '-- TOTAL --') continue;

                const missing = qCount - aCount;
                if (missing > 0) {
                    records.push({
                        class: subject,
                        chapter: chapter,
                        questions: qCount,
                        answers: aCount,
                        missing: missing
                    });
                }
            }
        }
    }

    // Sort by missing descending
    records.sort((a, b) => b.missing - a.missing);

    // Prepare output lines
    let outputLines = ['\uFEFFClass/Subject,Chapter,Total Questions,Total Answers,Missing Answers'];
    
    let totalMissing = 0;
    records.forEach(r => {
        totalMissing += r.missing;
        outputLines.push(`"${r.class}","${r.chapter}",${r.questions},${r.answers},${r.missing}`);
    });

    outputLines.push('================================================================================');
    outputLines.push(`"","--- TOTAL MISSING ANSWERS ---","","",${totalMissing}`);

    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    console.log(`Success! Missing QA file generated: ${outputPath}`);
    console.log(`Total missing answers across all chapters with deficits: ${totalMissing}`);

} catch (err) {
    console.error('Error processing CSV:', err.message);
}
