import Foundation
import PDFKit
let input = URL(fileURLWithPath: CommandLine.arguments[1])
guard let doc = PDFDocument(url: input) else { fatalError("Cannot read PDF") }
var pages: [[String: Any]] = []
for i in 0..<doc.pageCount {
    let text = doc.page(at: i)?.string ?? ""
    pages.append(["page": i + 1, "text": text, "hasExtractableText": !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty])
}
let payload: [String: Any] = ["pageCount": doc.pageCount, "pages": pages, "engine": "Apple PDFKit text extraction", "ocrPerformed": false]
let data = try JSONSerialization.data(withJSONObject: payload, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(data)
