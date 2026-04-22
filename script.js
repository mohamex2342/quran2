import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/index.js';
import { fetchFile, toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

const ffmpeg = new FFmpeg();

// دالة لجلب الفيديو من رابط عبر بروكسي لتجاوز CORS
async function getVideoFromUrl(url) {
    if (!url) return null;
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
    const mergeBtn = document.getElementById('mergeBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    try {
        if ((!vLink && !vFile) || (!lLink && !lFile)) {
            alert('يرجى اختيار الفيديوهات أولاً يا محمد');
            return;
        }

        mergeBtn.disabled = true;
        downloadBtn.style.display = 'none';
        document.getElementById('progressArea').style.display = 'block';
        status.innerText = "جاري جلب الفيديوهات من المصدر...";

        // تحديد مصدر الفيديو (رابط أو ملف)
        const videoData = vFile ? await fetchFile(vFile) : await getVideoFromUrl(vLink);
        const lyricsData = lFile ? await fetchFile(lFile) : await getVideoFromUrl(lLink);

        if (!videoData || !lyricsData) throw new Error("فشل جلب ملفات الفيديو");

        if (!ffmpeg.loaded) {
            status.innerText = "تحميل محرك المعالجة المحلي...";
            const baseURL = window.location.origin + '/ffmpeg';
            
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                workerURL: await toBlobURL(`${baseURL}/worker.js`, 'text/javascript'),
            });
        }

        ffmpeg.on('progress', ({ progress }) => {
            const p = Math.round(progress * 100);
            progressBar.style.width = `${p}%`;
            status.innerText = `جاري الدمج... اترك الصفحة مفتوحة (${p}%)`;
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
        
        downloadBtn.href = url;
        downloadBtn.download = "tiktok_merged.mp4";
        downloadBtn.style.display = "block";
        status.innerText = "تم الدمج بنجاح!";

    } catch (e) {
        console.error(e);
        status.innerText = "حدث خطأ: تأكد من صحة الروابط أو جرب رفع الملفات يدوياً";
        alert("فشل الدمج. يفضل استخدام متصفح كروم وتجربة ملفات أقصر.");
    } finally {
        mergeBtn.disabled = false;
    }
});
