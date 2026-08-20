// Manual mock for qrcode.react
const React_qrcode = require('react');

const QRCodeSVG = (props: any) =>
  React_qrcode.createElement('svg', {
    'data-testid': 'qrcode-svg',
    ...props,
  });
QRCodeSVG.displayName = 'QRCodeSVG';

module.exports = { QRCodeSVG };
