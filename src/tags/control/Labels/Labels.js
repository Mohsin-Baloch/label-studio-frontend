import React, { useEffect, useState } from 'react';
import { inject, observer } from 'mobx-react';
import { applyAction, cast, onSnapshot, types } from 'mobx-state-tree';

import { defaultStyle } from '../../../core/Constants';
import { customTypes } from '../../../core/CustomTypes';
import { guidGenerator } from '../../../core/Helpers';
import Registry from '../../../core/Registry';
import Tree from '../../../core/Tree';
import Types from '../../../core/Types';
import { AnnotationMixin } from '../../../mixins/AnnotationMixin';
import DynamicChildrenMixin from '../../../mixins/DynamicChildrenMixin';
import LabelMixin from '../../../mixins/LabelMixin';
import SelectedModelMixin from '../../../mixins/SelectedModel';
import { Block } from '../../../utils/bem';
import ControlBase from '../Base';
import '../Label';
import './Labels.styl';
import { Button, Select } from 'antd';
import { InstructionsModal } from '../../../components/InstructionsModal/InstructionsModal';

/**
 * The `Labels` tag provides a set of labels for labeling regions in tasks for machine learning and data science projects. Use the `Labels` tag to create a set of labels that can be assigned to identified region and specify the values of labels to assign to regions.
 *
 * All types of Labels can have dynamic value to load labels from task. This task data should contain a list of options to create underlying `<Label>`s. All the parameters from options will be transferred to corresponding tags.
 *
 * The Labels tag can be used with audio and text data types. Other data types have type-specific Labels tags.
 * @example
 * <!--Basic labeling configuration to apply labels to a passage of text -->
 * <View>
 *   <Labels name="type" toName="txt-1">
 *     <Label alias="B" value="Brand" />
 *     <Label alias="P" value="Product" />
 *   </Labels>
 *   <Text name="txt-1" value="$text" />
 * </View>
 *
 * @example <caption>This part of config with dynamic labels</caption>
 * <Labels name="product" toName="shelf" value="$brands" />
 * <!-- {
 *   "data": {
 *     "brands": [
 *       { "value": "Big brand" },
 *       { "value": "Another brand", "background": "orange" },
 *       { "value": "Local brand" },
 *       { "value": "Green brand", "alias": "Eco", showalias: true }
 *     ]
 *   }
 * } -->
 * @example <caption>is equivalent to this config</caption>
 * <Labels name="product" toName="shelf">
 *   <Label value="Big brand" />
 *   <Label value="Another brand" background="orange" />
 *   <Label value="Local brand" />
 *   <Label value="Green brand" alias="Eco" showAlias="true" />
 * </Labels>
 * @name Labels
 * @meta_title Labels Tag for Labeling Regions
 * @meta_description Customize Label Studio by using the Labels tag to provide a set of labels for labeling regions in tasks for machine learning and data science projects.
 * @param {string} name                      - Name of the element
 * @param {string} toName                    - Name of the element that you want to label
 * @param {single|multiple=} [choice=single] - Configure whether you can select one or multiple labels for a region
 * @param {number} [maxUsages]               - Maximum number of times a label can be used per task
 * @param {boolean} [showInline=true]        - Whether to show labels in the same visual line
 * @param {float=} [opacity=0.6]             - Opacity of rectangle highlighting the label
 * @param {string=} [fillColor]              - Rectangle fill color in hexadecimal
 * @param {string=} [strokeColor=#f48a42]    - Stroke color in hexadecimal
 * @param {number=} [strokeWidth=1]          - Width of the stroke
 * @param {string} [value]                   - Task data field containing a list of dynamically loaded labels (see example below)
 */
const TagAttrs = types.model({
  toname: types.maybeNull(types.string),

  choice: types.optional(types.enumeration(['single', 'multiple']), 'single'),
  maxusages: types.maybeNull(types.string),
  showinline: types.optional(types.boolean, true),

  // TODO this will move away from here
  groupdepth: types.maybeNull(types.string),

  opacity: types.optional(customTypes.range(), '0.2'),
  fillcolor: types.optional(customTypes.color, '#f48a42'),

  strokewidth: types.optional(types.string, '1'),
  strokecolor: types.optional(customTypes.color, '#f48a42'),
  fillopacity: types.maybeNull(customTypes.range()),
  allowempty: types.optional(types.boolean, false),

  value: types.optional(types.string, ''),
});

/**
 * @param {boolean} showinline
 * @param {identifier} id
 * @param {string} pid
 */
const ModelAttrs = types.model({
  pid: types.optional(types.string, guidGenerator),
  type: 'labels',
  children: Types.unionArray(['label', 'header', 'view', 'text', 'hypertext', 'richtext']),

  visible: types.optional(types.boolean, true),
});

const Model = LabelMixin.views(self => ({
  get shouldBeUnselected() {
    return self.choice === 'single';
  },
  get defaultChildType() {
    return 'label';
  },
  get isLabeling() {
    return true;
  },
})).actions(self => ({
  afterCreate() {
    if (self.allowempty) {
      let empty = self.findLabel(null);

      if (!empty) {
        const emptyParams = {
          value: null,
          type: 'label',
          background: defaultStyle.fillcolor,
        };

        if (self.children) {
          self.children.unshift(emptyParams);
        } else {
          self.children = cast([emptyParams]);
        }
        empty = self.children[0];
      }
      empty.setEmpty();
    }
  },
}));

const LabelsModel = types.compose(
  'LabelsModel',
  ControlBase,
  ModelAttrs,
  TagAttrs,
  AnnotationMixin,
  DynamicChildrenMixin,
  Model,
  SelectedModelMixin.props({ _child: 'LabelModel' }),
);

const customStyles = {
  flexRow: {
    display: "flex",
    justifyContent:'space-between',
    alignItems:'flex-start'
  },
  labelBtnContainer:{ minWidth:'40px', margin:'1rem' },
  flexCol: {
    display: "flex",
    flexDirection: "column",
    justifyContent:'space-between',
    alignItems:'center',
    height: "100%",
    minHeight: "25rem"
  },
  formSelect: {
    padding: "1px",
    margin : "1rem auto",
  },
  modalActionContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent : "end",
    width: "100%",
    margin: "1rem",
    padding: "2px",
    // marginTop: "6rem",
  },
  actionBtn: {
    margin: "auto 0.5rem",
  },
}

const dummyData = [
    { id: 1, value: 'pull-up' },
    { id: 2, value: 'push up' },
    { id: 3, value: 'push down' },
    { id: 4, value: 'deadlift-up' },
    { id: 5, value: 'deadlift-down' },
    { id: 6, value: 'benchpress-up' },
    { id: 7, value: 'benchpress-down' },
    { id: 9, value: 'frontsquat-up' },
    { id: 10, value: 'frontsquat-down' },
];

const HtxLabels = inject('store')(observer(({ item, store }) => {
  const {
    labelsData,
    addLabel,
    reAssignConfigLbl
  } = store;

  const [openLblSelection, setOpenLblSelection] = useState(false);
  const [labelsSelection, setLabelsSelection] = useState([...(labelsData).map(i => (i.value.toLowerCase))]);

  const getUpdatedConfigLbl = (labels) =>{
    // return `<Label key="${labels[labels.length -1].id}" value="${labels[labels.length -1].value}"/>`;
    return `<Labels name="tricks" toName="audio" choice="multiple">
        ${ labels.map(label => ( `<Label key="${label.id}" value="${label.value}"/>` ))}
      </Labels>`;
  }
  useEffect(() => {
    if(labelsData.length > 0) {
      const newConfigLbl = getUpdatedConfigLbl(labelsData);
      reAssignConfigLbl(newConfigLbl)
    }
  }, [labelsData.length])

  const getLabelSelectOptions = (data) => {
    return data.map(item => ({ key: item.id, value: item.value.toLowerCase(), label: item.value }));
  };
  const handleLabelSelectionChange = (value) => {
    setLabelsSelection([...value]);
  };
  const handleAddLabel = () =>{
    // addLabel();
    setOpenLblSelection(true);
  };
  const handleApplySelection = () => {
    const labels = [];
    for(let i=0; i< labelsSelection.length; i++){
      const item = dummyData.find(itm => itm.value.toLowerCase() === labelsSelection[i] );
      if (item)
      labels.push(item);
    }
    addLabel(labels);
    setOpenLblSelection(false);
  };
  const handleDiscardSelection = () =>{
    setOpenLblSelection(false);
    // setLabelsSelection([]);
  };
  return (
    <div style={customStyles.flexRow}>
      <Block name="labels" mod={{ hidden: !item.visible, inline: item.showinline }}>
      {Tree.renderChildren(item, item.annotation)}
      </Block>
      <div style={customStyles.labelBtnContainer}>
        <Button type='primary' ghost onClick={handleAddLabel}>Add Label</Button>
      </div>
      <InstructionsModal
        visible={openLblSelection}
        onCancel={() => setOpenLblSelection(false)}
        title="Labeling Selection"
      >
        <div style={customStyles.flexCol}>
          <div style={{ width: '100%', textAlign:'left'}}>
            <label>Select labels to apply:</label>
            <Select
              mode="multiple"
              size={'middle'}
              placeholder="Please select labels"
              onChange={handleLabelSelectionChange}
              style={{
                ...customStyles.formSelect,
                width: '100%',
              }}
              value={labelsSelection}
              options={getLabelSelectOptions(dummyData)}
            />
          </div>
          <div style={customStyles.modalActionContainer}>
            <Button danger style={customStyles.actionBtn} onClick={handleDiscardSelection}>Discard selection</Button>
            <Button type='primary' style={customStyles.actionBtn} onClick={handleApplySelection}>Apply selection</Button>
          </div>
        </div>
      </InstructionsModal>
    </div>
  );
}));

Registry.addTag('labels', LabelsModel, HtxLabels);

export { HtxLabels, LabelsModel };
