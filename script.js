import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/index.js';
import { fetchFile, toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

const ffmpeg = new FFmpeg();

// دالة لجلب الفيديو من رابط وتجاوز حماية CORS
async function getVideoFromUrl(url) {
    if (!url) return null;
    // نستخدم بروكسي عام لتجاوز قيود تيك توك والمتصفح
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
    const response = await fetch(proxyUrl);
    const blob = await response.blob();
    return new Uint8Array(await blob.arrayBuffer());
}

document.getElementById('mergeBtn').addEventListener('click', async () => {
    const vLink = document.getElementById('videoLink').value;
    const vFile = document.getElementById('videoFile').files[0];
    const lLink = document.getElementById('lyricsLink').value;
    const lFile = document.getElementById('lyricsFile').files[0];

    const status = document.getElementById('statusText');
    const progressBar = document.getElementById('progressBar');

    try {
        status.innerText = "جاري جلب الفيديوهات...";
        document.getElementById('progressArea').style.display = 'block';

        // تحديد مصدر الفيديو (رابط أو ملف)
        const videoData = vFile ? await fetchFile(vFile) : await getVideoFromUrl(vLink);
        const lyricsData = lFile ? await fetchFile(lFile) : await getVideoFromUrl(lLink);

        if (!videoData || !lyricsData) throw new Error("يرجى توفير الفيديوهات");

        if (!ffmpeg.loaded) {
            status.innerText = "تحميل محرك المعالجة...";
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/core.wasm`, 'application/wasm'),
                workerURL: await toBlobURL(`https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/worker.js`, 'text/javascript')
            });
        }

        ffmpeg.on('progress', ({ progress }) => {
            progressBar.style.width = `${progress * 100}%`;
        });

        await ffmpeg.writeFile('input1.mp4', videoData);
        await ffmpeg.writeFile('input2.mp4', lyricsData);

        // الدمج بنمط Screen لإزالة الخلفية السوداء
        await ffmpeg.exec([
            '-i', 'input1.mp4', '-i', 'input2.mp4',
            '-filter_complex', '[1:v]format=rgba,colorlevels=rimin=0.05:gimin=0.05:bimin=0.05[l];[0:v][l]blend=all_mode=\'screen\'',
            '-c:a', 'copy', 'output.mp4'
        ]);

        const data = await ffmpeg.readFile('output.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
        
        const dl = document.getElementById('downloadBtn');
        dl.href = url;
        dl.download = "tiktok_merged.mp4";
        dl.style.display = "block";
        status.innerText = "تم الدمج بنجاح!";

    } catch (e) {
        console.error(e);
        status.innerText = "حدث خطأ: تأكد من صحة الروابط أو جرب رفع الملفات يدوياً";
    }
});
