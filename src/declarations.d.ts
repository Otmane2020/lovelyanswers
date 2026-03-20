declare module "*.css" {}
declare module "*.png" {
  const value: string;
  export default value;
}
declare module "*.jpg" {
  const value: string;
  export default value;
}
declare module "*.webp" {
  const value: string;
  export default value;
}
declare module "*.svg" {
  const value: string;
  export default value;
}

// Override Next.js StaticImageData to be compatible with string src
declare module "next/dist/shared/lib/image-external" {
  interface StaticImageData {
    src: string;
    height: number;
    width: number;
    blurDataURL?: string;
  }
}
