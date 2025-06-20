/**
 * Comprehensive electronAPI availability checker
 */

export interface ElectronAPIStatus {
  available: boolean;
  methods: string[];
  timing: number;
  error?: string;
}

export function checkElectronAPI(): ElectronAPIStatus {
  const startTime = Date.now();
  
  try {
    if (!window.electronAPI) {
      return {
        available: false,
        methods: [],
        timing: Date.now() - startTime,
        error: 'window.electronAPI is undefined'
      };
    }

    const methods = Object.keys(window.electronAPI);
    
    return {
      available: true,
      methods,
      timing: Date.now() - startTime,
    };
  } catch (error) {
    return {
      available: false,
      methods: [],
      timing: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function waitForElectronAPI(timeout: number = 5000): Promise<ElectronAPIStatus> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      const status = checkElectronAPI();
      
      if (status.available) {
        console.log('✅ electronAPI became available after', Date.now() - startTime, 'ms');
        resolve(status);
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        console.log('❌ electronAPI timeout after', timeout, 'ms');
        resolve({
          available: false,
          methods: [],
          timing: Date.now() - startTime,
          error: `Timeout after ${timeout}ms`
        });
        return;
      }
      
      setTimeout(check, 50);
    };
    
    check();
  });
}

export function logElectronAPIStatus(): void {
  const status = checkElectronAPI();
  
  console.log('🔍 ElectronAPI Status:', {
    available: status.available,
    methodCount: status.methods.length,
    methods: status.methods,
    timing: status.timing + 'ms',
    error: status.error
  });
  
  if (status.available) {
    console.log('✅ ElectronAPI is working correctly');
  } else {
    console.log('❌ ElectronAPI is not available:', status.error);
    console.log('🔧 Debugging info:', {
      windowKeys: Object.keys(window).filter(key => 
        key.toLowerCase().includes('electron') || 
        key.toLowerCase().includes('api')
      ),
      contextIsolation: 'contextIsolation should be enabled',
      preloadScript: 'Check if preload script is loading'
    });
  }
}
