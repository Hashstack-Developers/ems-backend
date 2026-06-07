"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSubTaxDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_sub_tax_dto_1 = require("./create-sub-tax.dto");
class UpdateSubTaxDto extends (0, mapped_types_1.PartialType)(create_sub_tax_dto_1.CreateSubTaxDto) {
}
exports.UpdateSubTaxDto = UpdateSubTaxDto;
//# sourceMappingURL=update-sub-tax.dto.js.map