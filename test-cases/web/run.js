let rootEl = document.getElementById('root');
let runButtonEl = document.getElementById('runButton');
let runButtonLabelEl = document.getElementById('runButtonLabel');
let testCaseIndex = MMTestCasesWeb.mmjs.Common.Utils.parseOptionsFromQueryString().case || 0;

let testCases = [];

// fill up test-case array
{
  let i = 0;
  for (var caseName in MMTestCasesWeb) {
    if (caseName === 'mmjs') {
      continue;
    }
    let TestCase = MMTestCasesWeb[caseName];
    console.log(`Initializing test-case #${i++}:`, caseName);
    testCases.push([new TestCase(rootEl), caseName]);
  }
}

// print test-cases list, call async set-up function and install UI
{
  printTestCases();

  var caseName = testCases[testCaseIndex][1];

  runButtonLabelEl.innerHTML = caseName;

  setupTestCase(testCaseIndex, function () {
    console.log('Test-case setup done');
    runButtonEl.disabled = false;
  });
}

function printTestCases () {
  testCases.forEach(([, name]) => console.log('Ready test-case:', name));
}

function onClickRun () {
  runButtonEl.disabled = true;
  runTestCase(testCaseIndex);
}

function setupTestCase (i, done) {
  if (i >= testCases.length) {
    console.error('Bad test-case index:', i);
    window.alert('Query a valid test case please.');
    return;
  }
  console.log('Calling setup for test-case index:', i);
  testCases[i][0].setup(done);
}

function runTestCase (i) {
  if (i >= testCases.length) {
    console.error('Bad test-case index:', i);
    return;
  }
  console.log('Calling run for test-case index:', i);
  testCases[i][0].run();
}
