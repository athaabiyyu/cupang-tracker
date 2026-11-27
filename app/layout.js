import './globals.css';

export const metadata = {
  title: 'Catatan Cupang',
  description: 'Pencatatan bisnis cupang: harga beli, harga jual, dan profit.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
