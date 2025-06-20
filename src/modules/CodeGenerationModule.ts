import * as fs from 'fs';
import * as path from 'path';
import * as log from 'electron-log';
import { ActionSequence, ActionStep } from './ActionSequenceModule';

export interface GeneratedCode {
  type: 'script' | 'application';
  files: GeneratedFile[];
  instructions: string;
  dependencies: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  description: string;
}

export class CodeGenerationModule {
  constructor() {
    log.info('CodeGenerationModule initialized');
  }

  public async generateCode(sequence: ActionSequence, projectPath: string): Promise<GeneratedCode> {
    try {
      log.info(
        `Generating code for ${sequence.metadata.complexity} workflow with ${sequence.steps.length} steps`
      );

      // Determine output type based on complexity
      const outputType = this.determineOutputType(sequence);

      let generatedCode: GeneratedCode;

      if (outputType === 'script') {
        generatedCode = await this.generateScript(sequence, projectPath);
      } else {
        generatedCode = await this.generateApplication(sequence, projectPath);
      }

      // Save generated files to project directory
      await this.saveGeneratedFiles(generatedCode, projectPath);

      log.info(`Generated ${generatedCode.type} with ${generatedCode.files.length} files`);
      return generatedCode;
    } catch (error) {
      log.error('Error generating code:', error);
      throw error;
    }
  }

  private determineOutputType(sequence: ActionSequence): 'script' | 'application' {
    const { complexity, totalDuration } = sequence.metadata;
    const stepCount = sequence.steps.length;

    // Simple heuristics for determining output type
    if (complexity === 'simple' || (stepCount <= 10 && totalDuration <= 60)) {
      return 'script';
    } else {
      return 'application';
    }
  }

  private async generateScript(
    sequence: ActionSequence,
    projectPath: string
  ): Promise<GeneratedCode> {
    const scriptContent = this.generatePythonScript(sequence);
    const requirementsContent = this.generateRequirements(['pyautogui', 'time', 'logging']);
    const readmeContent = this.generateScriptReadme(sequence);

    return {
      type: 'script',
      files: [
        {
          path: 'automation_script.py',
          content: scriptContent,
          description: 'Main automation script',
        },
        {
          path: 'requirements.txt',
          content: requirementsContent,
          description: 'Python dependencies',
        },
        {
          path: 'README.md',
          content: readmeContent,
          description: 'Setup and usage instructions',
        },
      ],
      instructions:
        'Install dependencies with: pip install -r requirements.txt\nRun with: python automation_script.py',
      dependencies: ['pyautogui', 'time', 'logging'],
    };
  }

  private async generateApplication(
    sequence: ActionSequence,
    projectPath: string
  ): Promise<GeneratedCode> {
    const files: GeneratedFile[] = [];

    // Generate main application file
    files.push({
      path: 'src/main.py',
      content: this.generateApplicationMain(sequence),
      description: 'Main application entry point',
    });

    // Generate UI file
    files.push({
      path: 'src/ui.py',
      content: this.generateApplicationUI(sequence),
      description: 'User interface module',
    });

    // Generate automation module
    files.push({
      path: 'src/automation.py',
      content: this.generateAutomationModule(sequence),
      description: 'Automation logic module',
    });

    // Generate configuration
    files.push({
      path: 'config.json',
      content: this.generateApplicationConfig(sequence),
      description: 'Application configuration',
    });

    // Generate requirements
    files.push({
      path: 'requirements.txt',
      content: this.generateRequirements(['pyautogui', 'tkinter', 'json', 'logging', 'threading']),
      description: 'Python dependencies',
    });

    // Generate README
    files.push({
      path: 'README.md',
      content: this.generateApplicationReadme(sequence),
      description: 'Setup and usage instructions',
    });

    return {
      type: 'application',
      files,
      instructions:
        'Install dependencies with: pip install -r requirements.txt\nRun with: python src/main.py',
      dependencies: ['pyautogui', 'tkinter', 'json', 'logging', 'threading'],
    };
  }

  private generatePythonScript(sequence: ActionSequence): string {
    const imports = [
      'import pyautogui',
      'import time',
      'import logging',
      '',
      '# Configure logging',
      'logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")',
      'logger = logging.getLogger(__name__)',
      '',
      '# Configure pyautogui',
      'pyautogui.FAILSAFE = True',
      'pyautogui.PAUSE = 0.5',
      '',
    ].join('\n');

    const mainFunction = this.generateMainFunction(sequence);

    const script = [
      imports,
      mainFunction,
      '',
      'if __name__ == "__main__":',
      '    try:',
      '        main()',
      '        logger.info("Automation completed successfully")',
      '    except Exception as e:',
      '        logger.error(f"Automation failed: {e}")',
      '        raise',
    ].join('\n');

    return script;
  }

  private generateMainFunction(sequence: ActionSequence): string {
    const steps = sequence.steps.map((step, index) => this.generateStepCode(step, index));

    return [
      'def main():',
      '    """',
      `    Automated workflow: ${sequence.metadata.applicationContext || 'Unknown Application'}`,
      `    Generated from ${sequence.metadata.frameCount} frames`,
      `    Total duration: ${sequence.metadata.totalDuration.toFixed(1)} seconds`,
      '    """',
      '    logger.info("Starting automation workflow")',
      '',
      '    # Wait for user to position windows',
      '    time.sleep(3)',
      '',
      ...steps.map((step) => `    ${step}`),
      '',
      '    logger.info("Workflow completed")',
    ].join('\n');
  }

  private generateStepCode(step: ActionStep, index: number): string {
    const comment = `# Step ${index + 1}: ${step.description}`;

    switch (step.type) {
      case 'click':
        if (step.target) {
          return [
            comment,
            `pyautogui.click(${step.target.coordinates.x}, ${step.target.coordinates.y})`,
            `logger.info("Clicked at (${step.target.coordinates.x}, ${step.target.coordinates.y})")`,
          ].join('\n    ');
        }
        return comment + '\n    # Click coordinates not available';

      case 'type':
        return [
          comment,
          `pyautogui.write("${step.value || ''}")`,
          `logger.info("Typed: ${step.value || ''}")`,
        ].join('\n    ');

      case 'scroll':
        const scrollAmount = step.value === 'up' ? 3 : -3;
        return [
          comment,
          `pyautogui.scroll(${scrollAmount})`,
          `logger.info("Scrolled ${step.value}")`,
        ].join('\n    ');

      case 'wait':
        return [
          comment,
          `time.sleep(${step.duration || 1})`,
          `logger.info("Waited ${step.duration || 1} seconds")`,
        ].join('\n    ');

      case 'key_press':
        return [
          comment,
          `pyautogui.press("${step.value || 'space'}")`,
          `logger.info("Pressed key: ${step.value || 'space'}")`,
        ].join('\n    ');

      default:
        return comment + '\n    # Unknown action type';
    }
  }

  private generateApplicationMain(sequence: ActionSequence): string {
    return [
      'import tkinter as tk',
      'from tkinter import ttk, messagebox',
      'import threading',
      'import logging',
      'from ui import AutomationUI',
      'from automation import AutomationEngine',
      '',
      'def main():',
      '    """Main application entry point"""',
      '    logging.basicConfig(level=logging.INFO)',
      '    ',
      '    root = tk.Tk()',
      '    app = AutomationUI(root)',
      '    root.mainloop()',
      '',
      'if __name__ == "__main__":',
      '    main()',
    ].join('\n');
  }

  private generateApplicationUI(sequence: ActionSequence): string {
    return [
      'import tkinter as tk',
      'from tkinter import ttk, messagebox',
      'import threading',
      'from automation import AutomationEngine',
      '',
      'class AutomationUI:',
      '    def __init__(self, root):',
      '        self.root = root',
      '        self.root.title("Automated Workflow Runner")',
      '        self.root.geometry("600x400")',
      '        ',
      '        self.automation_engine = AutomationEngine()',
      '        self.setup_ui()',
      '    ',
      '    def setup_ui(self):',
      '        # Main frame',
      '        main_frame = ttk.Frame(self.root, padding="10")',
      '        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))',
      '        ',
      '        # Title',
      '        title_label = ttk.Label(main_frame, text="Automated Workflow", font=("Arial", 16))',
      '        title_label.grid(row=0, column=0, columnspan=2, pady=(0, 20))',
      '        ',
      '        # Run button',
      '        self.run_button = ttk.Button(main_frame, text="Run Automation", command=self.run_automation)',
      '        self.run_button.grid(row=1, column=0, pady=10)',
      '        ',
      '        # Stop button',
      '        self.stop_button = ttk.Button(main_frame, text="Stop", command=self.stop_automation, state="disabled")',
      '        self.stop_button.grid(row=1, column=1, pady=10)',
      '        ',
      '        # Progress bar',
      '        self.progress = ttk.Progressbar(main_frame, mode="indeterminate")',
      '        self.progress.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)',
      '        ',
      '        # Status label',
      '        self.status_label = ttk.Label(main_frame, text="Ready")',
      '        self.status_label.grid(row=3, column=0, columnspan=2, pady=10)',
      '    ',
      '    def run_automation(self):',
      '        self.run_button.config(state="disabled")',
      '        self.stop_button.config(state="normal")',
      '        self.progress.start()',
      '        self.status_label.config(text="Running automation...")',
      '        ',
      '        # Run automation in separate thread',
      '        thread = threading.Thread(target=self._run_automation_thread)',
      '        thread.daemon = True',
      '        thread.start()',
      '    ',
      '    def _run_automation_thread(self):',
      '        try:',
      '            self.automation_engine.run()',
      '            self.root.after(0, self._automation_completed)',
      '        except Exception as e:',
      '            self.root.after(0, lambda: self._automation_error(str(e)))',
      '    ',
      '    def _automation_completed(self):',
      '        self.progress.stop()',
      '        self.run_button.config(state="normal")',
      '        self.stop_button.config(state="disabled")',
      '        self.status_label.config(text="Automation completed successfully")',
      '        messagebox.showinfo("Success", "Automation completed successfully!")',
      '    ',
      '    def _automation_error(self, error_msg):',
      '        self.progress.stop()',
      '        self.run_button.config(state="normal")',
      '        self.stop_button.config(state="disabled")',
      '        self.status_label.config(text=f"Error: {error_msg}")',
      '        messagebox.showerror("Error", f"Automation failed: {error_msg}")',
      '    ',
      '    def stop_automation(self):',
      '        self.automation_engine.stop()',
      '        self._automation_completed()',
    ].join('\n');
  }

  private generateAutomationModule(sequence: ActionSequence): string {
    const stepMethods = sequence.steps
      .map((step, index) => this.generateStepMethod(step, index))
      .join('\n\n    ');

    return [
      'import pyautogui',
      'import time',
      'import logging',
      'import json',
      '',
      'class AutomationEngine:',
      '    def __init__(self):',
      '        self.logger = logging.getLogger(__name__)',
      '        self.running = False',
      '        ',
      '        # Configure pyautogui',
      '        pyautogui.FAILSAFE = True',
      '        pyautogui.PAUSE = 0.5',
      '        ',
      '        # Load configuration',
      '        with open("config.json", "r") as f:',
      '            self.config = json.load(f)',
      '    ',
      '    def run(self):',
      '        """Run the complete automation workflow"""',
      '        self.running = True',
      '        self.logger.info("Starting automation workflow")',
      '        ',
      '        try:',
      '            # Wait for user to position windows',
      '            time.sleep(3)',
      '            ',
      ...sequence.steps.map((_, index) => `            self.step_${index + 1}()`),
      '            ',
      '            self.logger.info("Workflow completed successfully")',
      '        except Exception as e:',
      '            self.logger.error(f"Workflow failed: {e}")',
      '            raise',
      '        finally:',
      '            self.running = False',
      '    ',
      '    def stop(self):',
      '        """Stop the automation"""',
      '        self.running = False',
      '        self.logger.info("Automation stopped by user")',
      '    ',
      `    ${stepMethods}`,
    ].join('\n');
  }

  private generateStepMethod(step: ActionStep, index: number): string {
    const methodName = `step_${index + 1}`;
    const docstring = `"""${step.description}"""`;

    let methodBody = '';

    switch (step.type) {
      case 'click':
        if (step.target) {
          methodBody = [
            `        if not self.running: return`,
            `        pyautogui.click(${step.target.coordinates.x}, ${step.target.coordinates.y})`,
            `        self.logger.info("Clicked at (${step.target.coordinates.x}, ${step.target.coordinates.y})")`,
          ].join('\n');
        }
        break;
      case 'type':
        methodBody = [
          `        if not self.running: return`,
          `        pyautogui.write("${step.value || ''}")`,
          `        self.logger.info("Typed: ${step.value || ''}")`,
        ].join('\n');
        break;
      case 'wait':
        methodBody = [
          `        if not self.running: return`,
          `        time.sleep(${step.duration || 1})`,
          `        self.logger.info("Waited ${step.duration || 1} seconds")`,
        ].join('\n');
        break;
      default:
        methodBody = `        self.logger.info("${step.description}")`;
    }

    return [`def ${methodName}(self):`, `    ${docstring}`, methodBody || '        pass'].join(
      '\n'
    );
  }

  private generateApplicationConfig(sequence: ActionSequence): string {
    const config = {
      workflow: {
        name: sequence.metadata.applicationContext || 'Automated Workflow',
        complexity: sequence.metadata.complexity,
        stepCount: sequence.steps.length,
        duration: sequence.metadata.totalDuration,
      },
      settings: {
        pauseBetweenSteps: 0.5,
        failsafeEnabled: true,
        logLevel: 'INFO',
      },
    };

    return JSON.stringify(config, null, 2);
  }

  private generateRequirements(dependencies: string[]): string {
    return dependencies.join('\n') + '\n';
  }

  private generateScriptReadme(sequence: ActionSequence): string {
    return [
      '# Automation Script',
      '',
      `Generated automation script for: ${sequence.metadata.applicationContext || 'Unknown Application'}`,
      '',
      '## Setup',
      '',
      '1. Install Python 3.7 or later',
      '2. Install dependencies: `pip install -r requirements.txt`',
      '',
      '## Usage',
      '',
      '1. Position your windows as they were during recording',
      '2. Run the script: `python automation_script.py`',
      '3. The script will wait 3 seconds before starting',
      '',
      '## Safety',
      '',
      '- Move your mouse to the top-left corner to stop the script (failsafe)',
      '- The script includes logging for debugging',
      '',
      '## Workflow Details',
      '',
      `- Steps: ${sequence.steps.length}`,
      `- Duration: ${sequence.metadata.totalDuration.toFixed(1)} seconds`,
      `- Complexity: ${sequence.metadata.complexity}`,
      '',
      '## Generated Steps',
      '',
      ...sequence.steps.map((step, index) => `${index + 1}. ${step.description}`),
    ].join('\n');
  }

  private generateApplicationReadme(sequence: ActionSequence): string {
    return [
      '# Automation Application',
      '',
      `Generated automation application for: ${sequence.metadata.applicationContext || 'Unknown Application'}`,
      '',
      '## Setup',
      '',
      '1. Install Python 3.7 or later',
      '2. Install dependencies: `pip install -r requirements.txt`',
      '',
      '## Usage',
      '',
      '1. Run the application: `python src/main.py`',
      '2. Click "Run Automation" to start the workflow',
      '3. Use "Stop" to halt the automation if needed',
      '',
      '## Features',
      '',
      '- Graphical user interface',
      '- Progress tracking',
      '- Error handling and logging',
      '- Safe stop functionality',
      '',
      '## Workflow Details',
      '',
      `- Steps: ${sequence.steps.length}`,
      `- Duration: ${sequence.metadata.totalDuration.toFixed(1)} seconds`,
      `- Complexity: ${sequence.metadata.complexity}`,
      '',
      '## File Structure',
      '',
      '- `src/main.py` - Application entry point',
      '- `src/ui.py` - User interface',
      '- `src/automation.py` - Automation logic',
      '- `config.json` - Configuration settings',
    ].join('\n');
  }

  private async saveGeneratedFiles(
    generatedCode: GeneratedCode,
    projectPath: string
  ): Promise<void> {
    const outputDir = path.join(projectPath, 'output');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const file of generatedCode.files) {
      const filePath = path.join(outputDir, file.path);
      const fileDir = path.dirname(filePath);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, file.content);
      log.info(`Saved generated file: ${filePath}`);
    }
  }
}
