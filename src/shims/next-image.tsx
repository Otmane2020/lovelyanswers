import React from "react";

const Image = React.forwardRef<HTMLImageElement, any>(
  ({ src, alt, width, height, fill, ...props }, ref) => (
    <img
      ref={ref}
      src={src}
      alt={alt || ""}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      style={fill ? { objectFit: "cover", width: "100%", height: "100%" } : undefined}
      {...props}
    />
  )
);
Image.displayName = "Image";

export default Image;
