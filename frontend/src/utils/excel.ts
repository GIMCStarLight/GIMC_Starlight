import ExcelJS from 'exceljs'

// 导入参数数据类型
export interface importExcelType {
  /**
   * 第 i 张工作表
   */
  i?: number;
  /**
   * 表格表头字段数组
   */
  header: readonly any[];
}


export class Excel {
    
  blob?: Blob; // 导入的blob文件
  worksheet?: ExcelJS.Worksheet;  // 当前工作表
  header: string[]; // 表头字段数组
  constructor(blob?: Blob) {
    this.blob = blob;
    this.worksheet = undefined;
    this.header = [];
  }

  /**
   * @description: blob转ArrayBuffer（用于后续生成文件数据）
   * @return {Promise<ArrayBuffer>} ArrayBuffer
   */
  private readFile(): Promise<ArrayBuffer> {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      let reader = new FileReader();
      if (!this.blob) {
        reject('上传文件异常!');
      } else {
        reader.readAsArrayBuffer(this.blob);
        reader.onload = (ev) => {
          resolve(ev.target!.result as ArrayBuffer);
        };
      }

    });
  }

  /**
   * @description: 导入excel文件获取workbook（workbook属性方法参考exceljs文档）
   * @return {Promise<ExcelJS.Workbook>} 
   */
  public async getWorkBook(): Promise<ExcelJS.Workbook> {
    let buffer = await this.readFile();
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
      return workbook;
    } catch (e) {
      throw new Error('Excel读取失败：请上传 .xlsx 文件（旧版 .xls 不支持）');
    }
  }

  /**
   * @description: 将 excel 第i张工作表的数据转为对象数据
   * @param {number} i 工作表序号
   * @param {string[]} header 表头字段数组
   * @return {Promise<Record<(typeof header)[number], string>[]>} 传入表头作为字段的对象数组(每个元素对象对应每一行)
   */
  public async importExcel(options: importExcelType): Promise<Record<(typeof header)[number], string>[]> {
    const { i = 1, header } = options;
    const workbook = await this.getWorkBook();
    const worksheet = workbook.getWorksheet(i) || workbook.worksheets[i - 1] || workbook.worksheets[0];
    if (!worksheet) {
      throw new Error(`Excel读取失败：未找到第 ${i} 张工作表或工作簿为空`);
    }
    const excelList: Record<(typeof header)[number], string>[] = [];

    const rows = worksheet.getSheetValues(); // 1-based index, rows[0] is null
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] as any[] | undefined;
      if (!row) continue;
      const tempObj: Record<(typeof header)[number], string> = {} as any;
      let hasValue = false;
      for (let c = 0; c < header.length; c++) {
        const cell = (row as any)[c + 1]; // columns are 1-based
        if (cell !== undefined && cell !== null && cell !== '') {
          hasValue = true;
        }
        tempObj[header[c]] = cell as any;
      }
      if (hasValue) {
        excelList.push(tempObj);
      }
    }
    return excelList;
  }
}

// 达人管理-表头映射
export const mapExcelInfluencer = {
    A: 'id',
    B: 'sex',
    C: 'name',
    D: 'nick_name',
    E: 'age',
    F: 'company'
}

// 供应商管理-表头映射（匹配后端实体字段）
export const mapExcelSupplier = {
    A: 'logo_url', // 机构logo (暂时保留，后端实体中没有此字段)
    B: 'supplier_full_name', // 供应商全称
    C: 'agency_name', // 机构名
    D: 'supplier_type', // 供应商性质
    E: 'current_policy_gradient', // 当前政策梯度
    F: 'billing_entity', // 开票主体
    G: 'collection_entity', // 收款主体
    H: 'policy_2024_gradient', // 24年政策梯度
    I: 'cooperation_mode_2024', // 24年合作模式
    J: 'total_amount_24', // 24年全年累量金额 (实体中没有此字段)
    K: 'contract_amount_24', // 24年合同期内累量金额 (实体中没有此字段)
    L: 'policy_2025_gradient', // 25年政策梯度
    M: 'cooperation_mode_2025', // 25年合作模式
    N: 'total_amount_25', // 25年全年累量金额 (实体中没有此字段)
    O: 'contract_amount_25', // 25年合同期内累量金额 (实体中没有此字段)
    P: 'pre_sign_total_amount', // 签框前累量金额 (实体中没有此字段)
    Q: 'tax_rate_percent', // 税率(%)
    R: 'payment_term', // 账期
    S: 'settlement_method', // 结算方式
    T: 'is_proxy_order', // 是否代下单
    U: 'agent_service_fee', // 代下单服务费 (实体中没有此字段)
    V: 'primary_contact_name', // 一级对接人姓名
    W: 'primary_contact_title', // 一级对接人职称 (实体中没有此字段)
    X: 'primary_contact_email', // 一级对接人邮箱 (实体中没有此字段)
    Y: 'primary_contact_phone_wechat', // 一级对接人微信号/电话号码
    Z: 'secondary_contact_name', // 二级对接人姓名
    AA: 'secondary_contact_title', // 二级对接人职称 (实体中没有此字段)
    AB: 'secondary_contact_phone_wechat', // 二级对接人微信号/电话号码
    AC: 'contract_start_date', // 年框合同开始时间
    AD: 'contract_end_date', // 年框合同结束时间
    AE: 'contract_expiry', // 年框合同到期时间 (实体中没有此字段)
    AF: 'contract_follow_up_person', // 年框合同跟进人
    AG: 'is_dual_signed', // 双盖合同 (实体中没有此字段)
    AH: 'resource_type', // 资源类型
    AI: 'resource_attribute', // 资源属性 (实体中没有此字段)
    AJ: 'can_cooperate_douyin', // 可合作平台-抖音 (实体中没有此字段)
    AK: 'can_cooperate_xiaohongshu', // 可合作平台-小红书 (实体中没有此字段)
    AL: 'can_cooperate_wechat_mp', // 可合作平台-微信公众号 (实体中没有此字段)
    AM: 'can_cooperate_wechat_video', // 可合作平台-微信视频号 (实体中没有此字段)
    AN: 'can_cooperate_weibo', // 可合作平台-微博 (实体中没有此字段)
    AO: 'can_cooperate_bilibili', // 可合作平台-B站 (实体中没有此字段)
    AP: 'can_cooperate_zhihu', // 可合作平台-知乎 (实体中没有此字段)
    AQ: 'can_cooperate_kuaishou', // 可合作平台-快手 (实体中没有此字段)
    AR: 'can_cooperate_dongchedi', // 可合作平台-懂车帝 (实体中没有此字段)
    AS: 'can_cooperate_other', // 可合作平台-其他 (实体中没有此字段)
    AT: 'supplier_description', // 供应商简介
}

export const mapExcelKolList = {
  A: 'serial_no',
  B: 'platform',
  C: 'account_name',
  D: 'account_id',
  E: 'home_link',
  F: 'followers_w',
  G: 'org_name',
  H: 'category',
  I: 'star_quote_21_60s',
  J: 'star_quote_60s_plus',
  K: 'is_exclusive',
  L: 'rebate_policy',
  M: 'rebate_range',
  N: 'policy_level',
  O: 'rebate_period',
  P: 'pay_period',
  Q: 'remark',
}

// 内部达人列表-表头映射（可按需调整）
export const mapExcelInternalInfluencerList = {
  A: 'serial_no', // 序号
  B: 'platform', // 账号平台
  C: 'nickname', // 账号名称/昵称
  D: 'star_id', // 账号ID/星图ID
  E: 'home_link', // 主页链接
  F: 'follower_count_w', // 粉丝量（w）
  G: 'institution_name', // 所属机构名
  H: 'category', // 账号类型（如美妆/母婴/汽车等）
  I: 'price_1_20', // 1-20秒报价
  J: 'price_60_plus', // 60s+ 报价
  K: 'is_exclusive', // 达人属性（独家/非独家）
  L: 'rebate_policy', // 返点政策（有/无）
  M: 'rebate_range', // 返点区间
  N: 'policy_level', // 政策等级
  O: 'rebate_period', // 返点账期
  P: 'pay_period', // 支付账期
  Q: 'remark', // 备注
}