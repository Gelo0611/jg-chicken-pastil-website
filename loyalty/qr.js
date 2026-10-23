import QRCode from './vendor/qr/index.js';
import QRErrorCorrectLevel from './vendor/qr/QRErrorCorrectLevel.js';
export function qrSvg(value){
  // locally generated, so customer QR works without an external image service.
  if(!value)return '<span>QR unavailable</span>';
  const qr=new QRCode(-1,QRErrorCorrectLevel.M);qr.addData(String(value));qr.make();
  const n=qr.getModuleCount(),pad=4,total=n+2*pad;
  let path='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))path+=`M${x+pad} ${y+pad}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" aria-label="Member QR code" role="img"><path fill="white" d="M0 0h${total}v${total}H0z"/><path fill="#152134" d="${path}"/></svg>`;
}
