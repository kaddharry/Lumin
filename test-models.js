const apiKey = "AIzaSyDFMq6pf2GYFlj8FsMKvS4NmDtRVOSF4mU";

async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log("Available models:");
    data.models.forEach(model => {
      console.log("\n---");
      console.log("Name:", model.name);
      console.log("Display Name:", model.displayName);
      console.log("Supported Methods:", model.supportedGenerationMethods);
    });
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
