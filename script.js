import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/index.js';
import { fetchFile, toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

const ffmpeg = new FFmpeg();

const mergeBtn = document.getElementById('mergeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const progressArea = document.getElementById('progressArea');
const statusText = document.getElementById('statusText');

mergeBtn.addEventListener('click', async () => {
    const videoFile = document.getElementById('videoInput').files[0];
    const lyricsFile = document.getElementById('lyricsInput').files[0];

    if (!videoFile || !lyricsFile) {
        alert('يرجى اختيار الملفات المطلوبة أولاً');
        return;
    }

    try {
        mergeBtn.disabled = true;
        progressArea.classList.remove('hidden');
        downloadBtn.classList.add('hidden');

        if (!ffmpeg.loaded) {
            statusText.innerText = "جاري تحميل المحرك...";
            // تأكد أن المجلد اسمه ffmpeg ويحتوي على الملفات الثلاثة
            const baseURL = window.location.origin + '/ffmpeg';
            
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                // سحب الـ Worker محلياً يحل مشكلة SecurityError
                workerURL: await toBlobURL(`${baseURL}/worker.js`, 'text/javascript'),
            });
        }

        ffmpeg.on('progress', ({ progress }) => {
            const p = Math.round(progress * 100);
            progressBar.style.width = `${p}%`;
            progressPercent.innerText = `${p}%`;
            statusText.innerText = "جاري المعالجة... قد تستغرق دقيقة";
        });

        await ffmpeg.writeFile('bg.mp4', await fetchFile(videoFile));
        await ffmpeg.writeFile('lyrics.mp4', await fetchFile(lyricsFile));

        // الأمر الاحترافي للدمج (Screen Mode)
        await ffmpeg.exec([
            '-i', 'bg.mp4',
            '-i', 'lyrics.mp4',
            '-filter_complex', '[1:v]format=rgba,colorlevels=rimin=0.05:gimin=0.05:bimin=0.05[l];[0:v][l]blend=all_mode=\'screen\':all_opacity=1',
            '-c:a', 'copy',
            'out.mp4'
        ]);

        const data = await ffmpeg.readFile('out.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

        downloadBtn.href = url;
        downloadBtn.download = 'merged_video.mp4';
        downloadBtn.classList.remove('hidden');
        statusText.innerText = "تم الدمج بنجاح!";
        
    } catch (err) {
        console.error("Error Detail:", err);
        statusText.innerText = "حدث خطأ في النظام!";
        alert("فشل الدمج. تأكد من أن ملف الـ Worker موجود في مجلد ffmpeg.");
    } finally {
        mergeBtn.disabled = false;
    }
});
