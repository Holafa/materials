import { JitoBundleId } from './jito-bundle';
import { handleAxiosError } from '../../utils/axios-utils';
import { jitoAxiosInstance } from './send-jito-bundle';
import { SentJitoBundle } from './sent-jito-bundle';

export async function getJitoBundleStatus(
  sentJitoBundle: SentJitoBundle
): Promise<JitoBundleId> {

  try {
    const bundleRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "getInflightBundleStatuses",
      params: [
        [
          sentJitoBundle.bundleId
        ]
      ]
    };

    const response = await jitoAxiosInstance.post("/api/v1/bundles", bundleRequest);

    if (response.data.result) {
      const result = response.data.result;
      console.log("Bundle result:", result);
      return result
    } else if (response.data.error) {
      console.error("Error sending bundle:", response.data.error.message || response.data.error);
      throw new Error(response.data.error.message || "Unknown error while sending bundle");
    } else {
      console.error("Unexpected response structure:", response.data);
      throw new Error("Unexpected response structure");
    }
  } catch (error: any) {
    return handleAxiosError(error);
  }
}