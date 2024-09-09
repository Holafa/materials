import axios from 'axios';

export const handleAxiosError = (error: any): never => {
  if (axios.isAxiosError(error)) {
    // Axios-specific error handling
    if (error.response) {
      // Server responded with a status code out of the 2xx range
      const responseText = error.response.data ? JSON.stringify(error.response.data) : 'No response body';
      throw new Error(`Server error: ${error.response.status} - ${responseText}`);
    } else if (error.request) {
      // No response received after request was sent
      throw new Error('No response received from the server');
    } else {
      // Something else went wrong in making the request
      throw new Error(`Axios request error: ${error.message}`);
    }
  } else {
    // Non-Axios error (e.g., code issues)
    throw new Error(`Unexpected error: ${error.message}`);
  }
};
