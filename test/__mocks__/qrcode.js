// Manual mock for qrcode — used in Jest tests to avoid loading
// the native canvas binary which is not available in the test environment.
module.exports = {
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,MOCK_QR_CODE'),
  toString: jest.fn().mockResolvedValue('MOCK_QR_STRING'),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('MOCK')),
};
