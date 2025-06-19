import * as log from 'electron-log';
import { FrameAnalysis, UIElement, DetectedAction } from './VisionAnalysisModule';

export interface ActionStep {
  type: 'click' | 'type' | 'scroll' | 'drag' | 'wait' | 'key_press';
  target?: {
    element: UIElement;
    coordinates: { x: number; y: number };
  };
  value?: string;
  duration?: number;
  timestamp: number;
  confidence: number;
  description: string;
}

export interface ActionSequence {
  steps: ActionStep[];
  metadata: {
    totalDuration: number;
    frameCount: number;
    complexity: 'simple' | 'medium' | 'complex';
    applicationContext?: string;
  };
}

export class ActionSequenceModule {
  private readonly CLICK_THRESHOLD = 0.7;
  private readonly TYPE_THRESHOLD = 0.6;
  private readonly MOVEMENT_THRESHOLD = 50; // pixels

  constructor() {
    log.info('ActionSequenceModule initialized');
  }

  public async generateSequence(frameAnalyses: FrameAnalysis[]): Promise<ActionSequence> {
    try {
      log.info(`Generating action sequence from ${frameAnalyses.length} frame analyses`);

      if (frameAnalyses.length === 0) {
        return this.createEmptySequence();
      }

      // Sort frames by timestamp
      const sortedFrames = frameAnalyses.sort((a, b) => a.timestamp - b.timestamp);

      // Extract actions from frame sequence
      const steps = await this.extractActionSteps(sortedFrames);

      // Analyze complexity
      const complexity = this.analyzeComplexity(steps, sortedFrames);

      // Detect application context
      const applicationContext = this.detectApplicationContext(sortedFrames);

      const sequence: ActionSequence = {
        steps,
        metadata: {
          totalDuration: this.calculateTotalDuration(sortedFrames),
          frameCount: sortedFrames.length,
          complexity,
          applicationContext
        }
      };

      log.info(`Generated sequence with ${steps.length} steps (complexity: ${complexity})`);
      return sequence;

    } catch (error) {
      log.error('Error generating action sequence:', error);
      throw error;
    }
  }

  private async extractActionSteps(frames: FrameAnalysis[]): Promise<ActionStep[]> {
    const steps: ActionStep[] = [];
    let previousFrame: FrameAnalysis | null = null;

    for (const frame of frames) {
      if (previousFrame) {
        const detectedSteps = this.compareFrames(previousFrame, frame);
        steps.push(...detectedSteps);
      }
      previousFrame = frame;
    }

    // Post-process steps to merge similar actions and add waits
    return this.postProcessSteps(steps);
  }

  private compareFrames(prevFrame: FrameAnalysis, currentFrame: FrameAnalysis): ActionStep[] {
    const steps: ActionStep[] = [];

    // Detect cursor movement and clicks
    const clickStep = this.detectClick(prevFrame, currentFrame);
    if (clickStep) {
      steps.push(clickStep);
    }

    // Detect typing
    const typeStep = this.detectTyping(prevFrame, currentFrame);
    if (typeStep) {
      steps.push(typeStep);
    }

    // Detect scrolling
    const scrollStep = this.detectScrolling(prevFrame, currentFrame);
    if (scrollStep) {
      steps.push(scrollStep);
    }

    // Detect key presses
    const keySteps = this.detectKeyPresses(prevFrame, currentFrame);
    steps.push(...keySteps);

    return steps;
  }

  private detectClick(prevFrame: FrameAnalysis, currentFrame: FrameAnalysis): ActionStep | null {
    if (!prevFrame.cursor || !currentFrame.cursor) {
      return null;
    }

    // Check for cursor position stability (indicating a click)
    const cursorMoved = this.calculateDistance(
      prevFrame.cursor,
      currentFrame.cursor
    ) > this.MOVEMENT_THRESHOLD;

    // Look for click actions in detected actions
    const clickAction = currentFrame.actions?.find(action => action.type === 'click');
    
    if (clickAction && clickAction.confidence > this.CLICK_THRESHOLD) {
      // Find the target element
      const targetElement = this.findElementAtPosition(
        currentFrame.elements,
        currentFrame.cursor.x,
        currentFrame.cursor.y
      );

      return {
        type: 'click',
        target: targetElement ? {
          element: targetElement,
          coordinates: { x: currentFrame.cursor.x, y: currentFrame.cursor.y }
        } : undefined,
        timestamp: currentFrame.timestamp,
        confidence: clickAction.confidence,
        description: targetElement 
          ? `Click on ${targetElement.type} "${targetElement.text || 'element'}"` 
          : `Click at (${currentFrame.cursor.x}, ${currentFrame.cursor.y})`
      };
    }

    return null;
  }

  private detectTyping(prevFrame: FrameAnalysis, currentFrame: FrameAnalysis): ActionStep | null {
    // Compare text content between frames
    const prevText = prevFrame.text?.join(' ') || '';
    const currentText = currentFrame.text?.join(' ') || '';

    if (currentText.length > prevText.length) {
      const typedText = currentText.substring(prevText.length);
      
      if (typedText.trim().length > 0) {
        // Find the active input element
        const inputElement = currentFrame.elements.find(el => 
          el.type === 'input' && el.confidence > this.TYPE_THRESHOLD
        );

        return {
          type: 'type',
          target: inputElement ? {
            element: inputElement,
            coordinates: { 
              x: inputElement.bounds.x + inputElement.bounds.width / 2,
              y: inputElement.bounds.y + inputElement.bounds.height / 2
            }
          } : undefined,
          value: typedText,
          timestamp: currentFrame.timestamp,
          confidence: inputElement?.confidence || 0.5,
          description: `Type "${typedText}"${inputElement ? ` in ${inputElement.text || 'input field'}` : ''}`
        };
      }
    }

    return null;
  }

  private detectScrolling(prevFrame: FrameAnalysis, currentFrame: FrameAnalysis): ActionStep | null {
    // Simple scroll detection based on element position changes
    if (prevFrame.elements.length === 0 || currentFrame.elements.length === 0) {
      return null;
    }

    // Check if similar elements have moved vertically
    let totalVerticalMovement = 0;
    let matchedElements = 0;

    for (const prevElement of prevFrame.elements) {
      const matchingElement = this.findSimilarElement(currentFrame.elements, prevElement);
      if (matchingElement) {
        totalVerticalMovement += matchingElement.bounds.y - prevElement.bounds.y;
        matchedElements++;
      }
    }

    if (matchedElements > 0) {
      const avgMovement = totalVerticalMovement / matchedElements;
      
      if (Math.abs(avgMovement) > 20) { // Threshold for scroll detection
        return {
          type: 'scroll',
          value: avgMovement > 0 ? 'down' : 'up',
          timestamp: currentFrame.timestamp,
          confidence: 0.8,
          description: `Scroll ${avgMovement > 0 ? 'down' : 'up'} by ${Math.abs(avgMovement)} pixels`
        };
      }
    }

    return null;
  }

  private detectKeyPresses(prevFrame: FrameAnalysis, currentFrame: FrameAnalysis): ActionStep[] {
    // Detect special key presses from actions
    const keyActions = currentFrame.actions?.filter(action => action.type === 'key_press') || [];
    
    return keyActions.map(action => ({
      type: 'key_press' as const,
      value: action.value || 'unknown',
      timestamp: currentFrame.timestamp,
      confidence: action.confidence,
      description: `Press ${action.value || 'key'}`
    }));
  }

  private postProcessSteps(steps: ActionStep[]): ActionStep[] {
    const processed: ActionStep[] = [];
    let lastStep: ActionStep | null = null;

    for (const step of steps) {
      // Add wait steps between actions if there's a significant time gap
      if (lastStep && step.timestamp - lastStep.timestamp > 2) {
        processed.push({
          type: 'wait',
          duration: step.timestamp - lastStep.timestamp,
          timestamp: lastStep.timestamp,
          confidence: 1.0,
          description: `Wait ${(step.timestamp - lastStep.timestamp).toFixed(1)} seconds`
        });
      }

      processed.push(step);
      lastStep = step;
    }

    return processed;
  }

  private analyzeComplexity(steps: ActionStep[], frames: FrameAnalysis[]): 'simple' | 'medium' | 'complex' {
    const uniqueActionTypes = new Set(steps.map(step => step.type)).size;
    const totalSteps = steps.length;
    const duration = this.calculateTotalDuration(frames);

    if (totalSteps <= 5 && uniqueActionTypes <= 2 && duration <= 30) {
      return 'simple';
    } else if (totalSteps <= 20 && uniqueActionTypes <= 4 && duration <= 120) {
      return 'medium';
    } else {
      return 'complex';
    }
  }

  private detectApplicationContext(frames: FrameAnalysis[]): string {
    // Analyze window titles and UI elements to determine application context
    const windowElements = frames.flatMap(frame => 
      frame.elements.filter(el => el.type === 'window')
    );

    if (windowElements.length > 0) {
      const windowTitles = windowElements
        .map(el => el.text)
        .filter(title => title && title.length > 0);
      
      if (windowTitles.length > 0) {
        return windowTitles[0]!;
      }
    }

    return 'Unknown Application';
  }

  private calculateTotalDuration(frames: FrameAnalysis[]): number {
    if (frames.length < 2) return 0;
    return frames[frames.length - 1].timestamp - frames[0].timestamp;
  }

  private calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
  }

  private findElementAtPosition(elements: UIElement[], x: number, y: number): UIElement | null {
    return elements.find(element => 
      x >= element.bounds.x &&
      x <= element.bounds.x + element.bounds.width &&
      y >= element.bounds.y &&
      y <= element.bounds.y + element.bounds.height
    ) || null;
  }

  private findSimilarElement(elements: UIElement[], target: UIElement): UIElement | null {
    return elements.find(element =>
      element.type === target.type &&
      element.text === target.text &&
      Math.abs(element.bounds.x - target.bounds.x) < 50 &&
      Math.abs(element.bounds.width - target.bounds.width) < 20
    ) || null;
  }

  private createEmptySequence(): ActionSequence {
    return {
      steps: [],
      metadata: {
        totalDuration: 0,
        frameCount: 0,
        complexity: 'simple'
      }
    };
  }
}
