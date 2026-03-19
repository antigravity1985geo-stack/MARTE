import jsPDF from 'jspdf';

export async function addGeorgianFont(doc: jsPDF) {
  try {
    const urls = [
      '/fonts/NotoSansGeorgian-Regular.ttf',
      '/fonts/NotoSansGeorgian-Bold.ttf'
    ];

    for (const url of urls) {
      const fileName = url.split('/').pop()!;
      const fontName = 'NotoSansGeorgian';
      const style = fileName.includes('Bold') ? 'bold' : 'normal';

      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const buffer = await response.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        doc.addFileToVFS(fileName, base64);
        doc.addFont(fileName, fontName, style);
      } catch (err) {
        console.warn('Failed to load font:', url, err);
      }
    }
    
    doc.setFont('NotoSansGeorgian', 'normal');
    return true;
  } catch (err) {
    console.error('Failed to add Georgian font to PDF', err);
    return false;
  }
}
