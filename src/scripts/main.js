export const customScript = function () {
  console.log("ENGrid client scripts are executing");
  // Add your client scripts here
  const backgroundImage = [
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-1.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-2.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-3.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-4.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-5.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-6.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-7.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-8.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-9.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-10.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-11.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-12.jpg?v=1578587000000",
    "https://aaf1a18515da0e792f78-c27fdabe952dfc357fe25ebf5c8897ee.ssl.cf5.rackcdn.com/2110/default-bg-13.jpg?v=1578587000000",
  ];
  // Check if Body has a data-engrid-no-page-backgroundImage attribute
  if (
    document.querySelector("[data-engrid-no-page-backgroundImage]") !== null
  ) {
    const randomImage =
      backgroundImage[Math.floor(Math.random() * backgroundImage.length)];
    console.log(randomImage);
    const pageBackground = document.querySelector(".page-backgroundImage");
    if (pageBackground) {
      pageBackground.style.setProperty(
        "--engrid__page-backgroundImage_url",
        `url(${randomImage})`
      );
      document.body.setAttribute("data-engrid-page-background", "image");
      document.body.removeAttribute("data-engrid-no-page-backgroundImage");
    }
  }
};
