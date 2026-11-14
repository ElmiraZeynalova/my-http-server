export type Headers = Record<string, string>
type ParseHeadersResult = {done: boolean, bytesConsumed: number}

export function parseHeader(headers: Headers, bytes: Buffer): ParseHeadersResult{
    const delimiter = Buffer.from("\r\n")
    const index = bytes.indexOf(delimiter)

    if(index === -1) return { done: false, bytesConsumed: 0 }
    if(index === 0) return { done: true, bytesConsumed: delimiter.length }

    const line = bytes.subarray(0, index).toString("utf8")
    const firstColonIndex = line.indexOf(":")

    if(firstColonIndex === -1) throw new Error("Invalid field-line syntax")

    const fieldName = line.slice(0, firstColonIndex)
    const fieldValue = line.slice(firstColonIndex + 1).trim()

    const validFieldName = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/

    if(fieldName.length === 0 || !validFieldName.test(fieldName)) throw new Error("Invalid field-name")
    
    const lowerCaseFieldName = fieldName.toLowerCase()

    if(lowerCaseFieldName in headers){
            headers[lowerCaseFieldName] = headers[lowerCaseFieldName].concat(", ", fieldValue)
    }else{
        headers[lowerCaseFieldName] = fieldValue
    }
    return { done: false, bytesConsumed: index + delimiter.length }
}

export function getHeaderValueByKey(headers: Headers, key: string): Record<string, string> | null {
  if(key.toLowerCase() in headers){
    return headers[key.toLowerCase()]
  }
  return null
}
