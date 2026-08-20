const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'components', 'SurveyBuilder.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');
let changes = 0;

// 1. Fix loadSurveys catch block (line 210)
// Line 210: "    } catch { /* ignore */ }"
const catchLineIdx = lines.findIndex((l, i) => l.trim() === '} catch { /* ignore */ }' && i >= 200 && i <= 215);
if (catchLineIdx !== -1) {
  // Replace: } catch { /* ignore */ }
  //          finally { setLoading(false); }
  // With:    } catch { /* ignore */ }
  //          if (surveys.length === 0) {
  //            setSurveys(generateMockData().map(s => ({...s, questions: s.questions.map(q => ({...q, validation: q.validation || {...}, conditionalLogic: q.conditionalLogic || {...}}))})));
  //          }
  //          finally { setLoading(false); }
  const finallyLineIdx = lines.findIndex((l, i) => i > catchLineIdx && l.trim() === 'finally { setLoading(false); }');
  if (finallyLineIdx !== -1) {
    lines.splice(finallyLineIdx, 0,
      '    if (surveys.length === 0) {',
      '      const mockData = generateMockData();',
      '      setSurveys(mockData.map(s => ({',
      "        ...s,",
      '        questions: s.questions.map(q => ({',
      "          ...q,",
      "          validation: q.validation || { minLength: 0, maxLength: 0, pattern: '', customMessage: '' },",
      "          conditionalLogic: q.conditionalLogic || { enabled: false, questionId: '', operator: 'equals', value: '' },",
      '        })),',
      '      })));',
      '    }',
    );
    changes++;
    console.log('✅ Added generateMockData fallback to loadSurveys');
  }
} else {
  console.log('❌ Could not find loadSurveys catch block');
}

// 2. Fix loadResponses catch block (line 226)
const respCatchIdx = lines.findIndex((l, i) => l.trim() === '} catch { /* ignore */ }' && i >= 220 && i <= 230);
if (respCatchIdx !== -1) {
  // After: } catch { /* ignore */ }  (line 226)
  // The next line is:  "  };"
  // Insert fallback before "  };"
  const closingLineIdx = lines.findIndex((l, i) => i > respCatchIdx && l.trim() === '};');
  if (closingLineIdx !== -1) {
    lines.splice(closingLineIdx, 0,
      '    // Fallback: use generateMockResponses when API is unavailable',
      '    if (responses.length === 0 && surveyId) {',
      '      setResponses(generateMockResponses(surveyId));',
      '    }',
    );
    changes++;
    console.log('✅ Added generateMockResponses fallback to loadResponses');
  }
} else {
  console.log('❌ Could not find loadResponses catch block');
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log(`\n✅ Total: ${changes} change(s) made to SurveyBuilder.tsx`);
