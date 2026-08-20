const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'src', 'components', 'SurveyBuilder.tsx');
let c = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// 1. Fix loadSurveys - replace the catch block to use generateMockData as fallback
const oldCatch = `    } catch { /* ignore */ }
    finally { setLoading(false); }`;

const newCatch = `    } catch { /* ignore */ }
    // Fallback: use generateMockData when API is unavailable
    if (surveys.length === 0) {
      const mockData = generateMockData();
      setSurveys(mockData.map(s => ({
        ...s,
        questions: s.questions.map(q => ({
          ...q,
          validation: q.validation || { minLength: 0, maxLength: 0, pattern: '', customMessage: '' },
          conditionalLogic: q.conditionalLogic || { enabled: false, questionId: '', operator: 'equals', value: '' },
        })),
      })));
    }
    finally { setLoading(false); }`;

if (c.includes(oldCatch)) {
  c = c.replace(oldCatch, newCatch);
  changes++;
  console.log('✅ Added generateMockData fallback to loadSurveys');
} else {
  console.log('❌ Could not find catch block in loadSurveys');
}

// 2. Fix loadResponses - add generateMockResponses as fallback
const oldResponsesCatch = `    } catch { /* ignore */ }`;

const newResponsesCatch = `    } catch { /* ignore */ }
    // Fallback: use generateMockResponses when API is unavailable
    if (responses.length === 0 && surveyId) {
      setResponses(generateMockResponses(surveyId));
    }`;

// Find the loadResponses function's catch block (the one after `if (data.success)`)
const loadResponsesPattern = `    } catch { /* ignore */ }
  };`;

// We need to target the right catch - the one in loadResponses, not loadSurveys
// Let's find it by looking for the line before loadResponses' catch
const beforeCatch = `        })));\n      }\n    } catch { /* ignore */ }\n  };\n`;

const afterCatch = `        })));\n      }\n    } catch { /* ignore */ }\n    // Fallback: use generateMockResponses when API is unavailable\n    if (responses.length === 0 && surveyId) {\n      setResponses(generateMockResponses(surveyId));\n    }\n  };\n`;

if (c.includes(beforeCatch)) {
  c = c.replace(beforeCatch, afterCatch);
  changes++;
  console.log('✅ Added generateMockResponses fallback to loadResponses');
} else {
  console.log('❌ Could not find loadResponses catch block');
}

fs.writeFileSync(filePath, c);
console.log(`\n✅ Total: ${changes} change(s) made to SurveyBuilder.tsx`);
