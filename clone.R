library(repmis)

data <- source_data("https://gist.githubusercontent.com/MARSHMALLLOW/115e8b59d77997677e388d7173e7f78a/raw/24fd6065afdcce7012f2a3f1b86c9438b633ed4b/files-extensions.js")
data = substr(data, 0, nchar(data))
data = gsub("c(", "", data, fixed = TRUE)
data = gsub(")", "", data, fixed = TRUE)

write(data, "data.dat")
data