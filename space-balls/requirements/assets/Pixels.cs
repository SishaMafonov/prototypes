using System;
using System.Drawing;

public static class RequirementPixels
{
    public static Bitmap Mask(Bitmap source, float cx, float cy, float radius)
    {
        var mask = new Bitmap(source.Width, source.Height);
        double squared = radius * radius;
        for (int y = 0; y < source.Height; y++)
        for (int x = 0; x < source.Width; x++)
        {
            double dx = x + 0.5 - cx, dy = y + 0.5 - cy;
            bool include = dx * dx + dy * dy <= squared && source.GetPixel(x, y).A >= 250;
            mask.SetPixel(x, y, include ? Color.White : Color.Black);
        }
        return mask;
    }

    public static string Rgba(Bitmap source)
    {
        var data = new byte[source.Width * source.Height * 4];
        for (int y = 0; y < source.Height; y++)
        for (int x = 0; x < source.Width; x++)
        {
            var p = source.GetPixel(x, y);
            int offset = (y * source.Width + x) * 4;
            data[offset] = p.R; data[offset + 1] = p.G;
            data[offset + 2] = p.B; data[offset + 3] = p.A;
        }
        return Convert.ToBase64String(data);
    }
}
