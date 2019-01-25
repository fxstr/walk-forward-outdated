function pad(nr) {
    return nr < 10 ? `0${nr}` : nr;
}

export default function formatDate(date) {
    const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const timeString = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    return `${dateString} ${timeString}`;
}