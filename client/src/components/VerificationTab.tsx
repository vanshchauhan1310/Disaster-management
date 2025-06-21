import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { verifyImage } from '../services/api';

interface VerificationResult {
  authenticityScore: number | null;
  isLikelyAuthentic: boolean;
  analysis: string;
}

export function VerificationTab() {
  const [imageUrl, setImageUrl] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!imageUrl) {
      setError('Please enter an image URL.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await verifyImage(imageUrl);
      setResult(response.data);
    } catch (err) {
      setError('Failed to verify the image.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} />
        <h2 className="text-lg font-semibold">Image Verification</h2>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Enter image URL to verify"
          className="flex-grow px-3 py-2 border border-gray-300 rounded-md"
        />
        <button onClick={handleVerify} disabled={loading} className="bg-green-500 text-white px-4 py-2 rounded-md">
          {loading ? 'Verifying...' : 'Verify Image'}
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {result && (
        <div className="border-t pt-4 space-y-2">
          <p><strong>Authenticity Score:</strong> {result.authenticityScore ?? 'N/A'}</p>
          <p><strong>Likely Authentic:</strong> {result.isLikelyAuthentic ? 'Yes' : 'No'}</p>
          <p><strong>Analysis:</strong> {result.analysis}</p>
        </div>
      )}
    </div>
  );
} 