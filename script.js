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
        alert('من فضلك اختر الفيديوهات أولاً يا محمد');
        return;
    }

    try {
        mergeBtn.disabled = true;
        progressArea.classList.remove('hidden');
        downloadBtn.classList.add('hidden');

        // تحميل المكتبة من الملفات المحلية
        if (!ffmpeg.loaded) {
            statusText.innerText = "تحميل المحرك...";
            const baseURL = window.location.origin + '/ffmpeg'; 
            
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
            });
        }

        ffmpeg.on('progress', ({ progress }) => {
            const p = Math.round(progress * 100);
            progressBar.style.width = `${p}%`;
            progressPercent.innerText = `${p}%`;
            statusText.innerText = "جاري دمج الفيديوهات...";
        });

        // كتابة الملفات في الذاكرة
        await ffmpeg.writeFile('main.mp4', await fetchFile(videoFile));
        await ffmpeg.writeFile('text.mp4', await fetchFile(lyricsFile));

        // تنفيذ أمر الدمج الاحترافي
        // filter_complex: تفتيح النص وإزالة السواد (Screen Blend)
        await ffmpeg.exec([
            '-i', 'main.mp4',
            '-i', 'text.mp4',
            '-filter_complex', '[1:v]format=rgba,colorlevels=rimin=0.05:gimin=0.05:bimin=0.05[l];[0:v][l]blend=all_mode=\'screen\':all_opacity=1',
            '-c:a', 'copy',
            'output.mp4'
        ]);

        // قراءة النتيجة
        const data = await ffmpeg.readFile('output.mp4');
        const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

        downloadBtn.href = url;
        downloadBtn.download = 'Merged_Video_By_Mohamed.mp4';
        downloadBtn.classList.remove('hidden');
        statusText.innerText = "اكتمل الدمج بنجاح!";
        
    } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء المعالجة، تأكد من إعدادات COEP/COOP');
    } finally {
        mergeBtn.disabled = false;
    }
});
