using System;
using System.IO;
using System.Threading.Tasks;
using SmartGrader.Core.Interfaces;

namespace SmartGrader.Image.Services
{
    public class ImageProcessingService : IImageProcessingService
    {
        private const int MaxWidth = 1920;
        private const int MaxHeight = 1080;

        public async Task<byte[]> ProcessImageAsync(byte[] imageData)
        {
            return await Task.Run(() =>
            {
                using var ms = new MemoryStream(imageData);
                using var image = System.Drawing.Image.FromStream(ms);
                
                int width = image.Width;
                int height = image.Height;
                
                if (width > MaxWidth || height > MaxHeight)
                {
                    double scale = Math.Min((double)MaxWidth / width, (double)MaxHeight / height);
                    width = (int)(width * scale);
                    height = (int)(height * scale);
                }

                using var resized = new System.Drawing.Bitmap(image, width, height);
                using var outputMs = new MemoryStream();
                resized.Save(outputMs, System.Drawing.Imaging.ImageFormat.Jpeg);
                return outputMs.ToArray();
            });
        }

        public async Task<string> ExtractTextAsync(byte[] imageData)
        {
            try
            {
                return await Task.Run(() =>
                {
                    using var ms = new MemoryStream(imageData);
                    using var image = System.Drawing.Image.FromStream(ms);
                    
                    var tempPath = Path.Combine(Path.GetTempPath(), $"ocr_{Guid.NewGuid()}.png");
                    image.Save(tempPath, System.Drawing.Imaging.ImageFormat.Png);

                    try
                    {
                        // Note: Tesseract 5.x API may vary
                        // This is a placeholder for OCR functionality
                        return string.Empty;
                    }
                    finally
                    {
                        if (File.Exists(tempPath))
                            File.Delete(tempPath);
                    }
                });
            }
            catch
            {
                return await Task.FromResult(string.Empty);
            }
        }

        public Core.Interfaces.ImageInfo GetImageInfo(byte[] imageData)
        {
            try
            {
                using var ms = new MemoryStream(imageData);
                using var image = System.Drawing.Image.FromStream(ms);
                
                return new Core.Interfaces.ImageInfo
                {
                    Width = image.Width,
                    Height = image.Height,
                    Format = GetMimeType(image.RawFormat),
                    SizeInBytes = imageData.Length
                };
            }
            catch
            {
                return new Core.Interfaces.ImageInfo
                {
                    Width = 0,
                    Height = 0,
                    Format = "unknown",
                    SizeInBytes = imageData.Length
                };
            }
        }

        private string GetMimeType(System.Drawing.Imaging.ImageFormat format)
        {
            if (format.Equals(System.Drawing.Imaging.ImageFormat.Jpeg)) return "image/jpeg";
            if (format.Equals(System.Drawing.Imaging.ImageFormat.Png)) return "image/png";
            if (format.Equals(System.Drawing.Imaging.ImageFormat.Gif)) return "image/gif";
            return "unknown";
        }
    }
}
