export class PluginSample {
    name: string = "PluginSample";
    version: string = "1.0.0";
    description: string = "A sample plugin";
    author: string = "John Doe";
    license: string = "MIT";
    onLoad() {
        console.log("PluginSample loaded");
    }
    onUnload() {
        console.log("PluginSample unloaded");
    }
    onRestart() {

    }    
}