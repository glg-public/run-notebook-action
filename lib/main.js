"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob = __importStar(require("glob"));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const workspace = core.getInput('workspace');
            const papermillOutput = path.join(workspace, "papermill-nb-runner.out");
            const requirements = 'requirements.txt';
            const requirementsFile = path.join(workspace, requirements);
            const temp_dir = core.getInput('temp_dir');
            const outputDir = path.join(temp_dir, "nb-runner");
            const scriptsDir = path.join(temp_dir, "nb-runner-scripts");
            const notebookFilesPattern = core.getInput('notebooks');
            const notebookFiles = glob.sync(path.join(workspace, notebookFilesPattern));
            const isReport = core.getInput('isReport');
            const poll = core.getInput('poll');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }
            if (!fs.existsSync(scriptsDir)) {
                fs.mkdirSync(scriptsDir);
            }
            // Install dependencies
            yield exec.exec('pip install --upgrade setuptools');
            if (fs.existsSync(requirementsFile)) {
                yield exec.exec(`python3 -m pip install -r ${requirementsFile}`);
            }
            yield exec.exec('python3 -m pip install papermill ipykernel nbformat');
            yield exec.exec('python3 -m ipykernel install --user');
            // Execute notebooks
            yield Promise.all(notebookFiles.map((notebookFile, index) => __awaiter(this, void 0, void 0, function* () {
                const executeScriptPath = path.join(scriptsDir, `nb-runner-${index}.py`);
                const parsedNotebookFile = path.join(outputDir, path.basename(notebookFile));
                const pythonCode = `
import papermill as pm
import os
from os import path, system
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import sleep

isDone = False
def watch():
    global isDone
    while not isDone:
      sleep(15)
      system('echo "***Polling latest output status result***"')
      system('tail -n 15 ${papermillOutput}')
      system('echo "***End of polling latest output status result***"')

def run():
  global isDone
  try:
    pm.execute_notebook(
      input_path='${notebookFile}',
      output_path='${parsedNotebookFile}',
      log_output=True,
      report_mode=${!!isReport ? "True" : "False"}
    )
  finally:
    isDone = True

results = []
with ThreadPoolExecutor() as executor:
  results.append(executor.submit(run))
  if ${!!poll ? "True" : "False"}:
    results.append(executor.submit(watch))

for task in as_completed(results):
  try:
    task.result()
  except Exception as e:
    print(e, file=sys.stderr)
    sys.exit(1)
`;
                fs.writeFileSync(executeScriptPath, pythonCode);
                yield exec.exec(`cat ${executeScriptPath}`);
                yield exec.exec(`python3 ${executeScriptPath}`);
            }))).catch((error) => {
                core.setFailed(error.message);
            });
        }
        catch (error) {
            core.setFailed(error.message);
        }
    });
}
run();
