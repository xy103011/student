using System;
using System.IO;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Processing;
using SmartGrader.Core.Interfaces;

namespace SmartGrader.Image.Services
{
    public class ImageProcessingService : IImageProcessingService
    {
        private const int MaxWidth = 1920;
        private const int MaxHeight = 1080;

        public async Task<byte[]> ProcessImageAsync(byte[] imageData)
        {
            using var image = Image.Load(imageData);
            
            if (image.Width > MaxWidth || image.Height > MaxHeight)
            {
                image.Mutate(x => x.Resize(MaxWidth, MaxHeight));
            }

            using var ms = new MemoryStream();
            await image.SaveAsync(ms, new JpegEncoder { Quality = 85 });
            return ms.ToArray();
        }

        public async Task<string> ExtractTextAsync(byte[] imageData)
        {
            try
            {
                using var image = Image.Load(imageData);
                
                var tempPath = Path.Combine(Path.GetTempPath(), $"ocr_{Guid.NewGuid()}.png");
                await image.SaveAsPngAsync(tempPath);

                try
                {
                    using var engine = new Tesseract.Engine();
                    using var pix = Pix.LoadFromFile(tempPath);
                    var text = engine.Recognize(pix);
                    return text?.Text ?? string.Empty;
                }
                finally
                {
                    if (File.Exists(tempPath))
                        File.Delete(tempPath);
                }
            }
            catch
            {
                return string.Empty;
            }
        }

        public ImageInfo GetImageInfo(byte[] imageData)
        {
            try
            {
                using var image = Image.Load(imageData);
                
                return new ImageInfo
                {
                    Width = image.Width,
                    Height = image.Height,
                    Format = image.Format?.MimeType ?? "unknown",
                    SizeInBytes = imageData.Length
                };
            }
            catch
            {
                return new ImageInfo
                {
                    Width = 0,
                    Height = 0,
                    Format = "unknown",
                    SizeInBytes = imageData.Length
                };
            }
        }
    }
}
