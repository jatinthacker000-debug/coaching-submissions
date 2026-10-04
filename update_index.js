const fs = require('fs');

const indexFile = 'index.html';
let content = fs.readFileSync(indexFile, 'utf8');

const startMarker = '<!-- NEW STUDENT REPORT SECTION -->';
const endMarker = '    </div>\n    \n    <div class="mobile-footer"';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const updatedContent = content.substring(0, startIndex) + '<!-- Student report section has been moved to grade12.html -->\n' + content.substring(endIndex);
    fs.writeFileSync(indexFile, updatedContent, 'utf8');
    console.log('Successfully updated index.html');
} else {
    console.log('Markers not found in index.html');
}
