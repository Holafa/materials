export function millisecondsToHumanReadable(ms: number): string {
    const msPerSecond = 1000;
    const msPerMinute = msPerSecond * 60;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;

    const days = Math.floor(ms / msPerDay);
    ms %= msPerDay;

    const hours = Math.floor(ms / msPerHour);
    ms %= msPerHour;

    const minutes = Math.floor(ms / msPerMinute);
    ms %= msPerMinute;

    const seconds = Math.floor(ms / msPerSecond);

    const parts = [];

    if (days > 0) {
        parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    }
    if (hours > 0) {
        parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    if (seconds > 0 || parts.length === 0) { // show seconds if no other units are shown
        parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    }

    return parts.join(' ');
}