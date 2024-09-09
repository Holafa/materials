import { Context } from 'telegraf';
import { PhotoSize } from 'telegraf/types';
import axios from 'axios';

export async function downloadPhoto(ctx: Context): Promise<Blob | undefined> {
    // Check if the message contains a photo
    const photoSize = (ctx.message as any)?.photo as (PhotoSize[] | undefined);

    // If the message contains a photo, handle it
    if (Array.isArray(photoSize) && photoSize.length > 0) {
        const lastPhoto = photoSize[photoSize.length - 1]; // Get the highest resolution photo

        const file = await ctx.telegram.getFile(lastPhoto.file_id);
        const fileLink = await ctx.telegram.getFileLink(file);

        const response = await axios.get(fileLink.href, {
            responseType: 'arraybuffer',
        });

        // Return the image as a Blob
        return new Blob([response.data], { type: 'image/jpeg' });
    }

    // Check if the message contains a document and if it's an image (e.g., PNG, JPEG)
    const document = (ctx.message as any)?.document;
    if (document && document.mime_type && document.mime_type.startsWith('image/')) {
        const file = await ctx.telegram.getFile(document.file_id);
        const fileLink = await ctx.telegram.getFileLink(file);

        const response = await axios.get(fileLink.href, {
            responseType: 'arraybuffer',
        });

        // Return the image as a Blob with the appropriate MIME type
        return new Blob([response.data], { type: document.mime_type });
    }

    // If no image is found, return undefined
    return undefined;
}