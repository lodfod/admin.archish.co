const API_URL = import.meta.env.VITE_API_URL;

export const generateSummary = async (content: string): Promise<string> => {
  try {
    console.log("Sending request to backend...");
    const response = await fetch(`${API_URL}/generate-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate summary');
    }

    return data.summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    return "Error generating summary";
  }
};
